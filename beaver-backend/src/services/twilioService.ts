/**
 * Service Twilio - Envoi d'alertes WhatsApp et SMS
 *
 * Logique :
 * 1. Twilio Lookup API vérifie si le numéro supporte WhatsApp
 * 2. Si oui → envoie via WhatsApp Business (template approuvé Meta)
 * 3. Sinon → fallback SMS classique
 */
import twilio from 'twilio';
import { BeaverSession, Contact, Alert } from '../models/types';
import { db, COLLECTIONS } from '../config/firebase';
import logger from '../config/logger';

// Initialisation client Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * Vérifie si un numéro est joignable via WhatsApp via Twilio Lookup
 * Retourne 'whatsapp' ou 'sms'
 */
export const detectChannel = async (phone: string): Promise<'whatsapp' | 'sms'> => {
  try {
    // Twilio Lookup v2 avec channel lookup WhatsApp
    const lookup = await twilioClient.lookups.v2.phoneNumbers(phone).fetch({
      // @ts-ignore - Les types Twilio ne sont pas toujours à jour
      fields: 'line_type_intelligence',
    });

    // En production : vérifier lookup.channelEligibility?.whatsapp
    // Pour simplifier, on utilise le type de ligne
    const lineType = (lookup as any).lineTypeIntelligence?.type;
    logger.debug(`📱 Lookup ${phone}`, { lineType });

    // Les mobiles peuvent recevoir WhatsApp
    if (lineType === 'mobile' || lineType === 'personal') {
      return 'whatsapp';
    }
    return 'sms';
  } catch (error) {
    logger.warn(`⚠️ Lookup échoué pour ${phone}, fallback SMS`, { error });
    return 'sms';
  }
};

/**
 * Construit le lien de tracking pour les proches
 */
const buildTrackingUrl = (sessionId: string): string => {
  const baseUrl = process.env.BEAVER_WEB_URL ?? 'https://beaver.app';
  return `${baseUrl}/s/${sessionId}`;
};

/**
 * Envoie un message WhatsApp via template approuvé Meta
 * Template catégorie Utility - doit être pré-approuvé dans Twilio Console
 */
const sendWhatsApp = async (contact: Contact, session: BeaverSession): Promise<string> => {
  const trackingUrl = buildTrackingUrl(session.sessionId);

  const message = await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER!, // whatsapp:+14155238886
    to: `whatsapp:${contact.phone}`,
    // Option 1 : Template approuvé Meta (production)
    ...(process.env.WHATSAPP_TEMPLATE_SID
      ? {
          contentSid: process.env.WHATSAPP_TEMPLATE_SID,
          contentVariables: JSON.stringify({
            1: session.userFirstName,  // {{1}} = prénom
            2: trackingUrl,            // {{2}} = lien tracking
          }),
        }
      : {
          // Option 2 : Message libre (sandbox Twilio dev uniquement)
          body: `🦫 ALERTE BEAVER\n${session.userFirstName} a besoin d'aide !\nSuivez sa position en direct :\n${trackingUrl}\n\nAppuyez sur le lien ou appelez le 17 (Police) / 112 (Urgences)`,
        }),
  });

  logger.info(`📲 WhatsApp envoyé`, { to: contact.phone, sid: message.sid });
  return message.sid;
};

/**
 * Envoie un SMS classique (fallback)
 */
const sendSms = async (contact: Contact, session: BeaverSession): Promise<string> => {
  const trackingUrl = buildTrackingUrl(session.sessionId);

  const message = await twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: contact.phone,
    body: `🆘 ALERTE BEAVER\n${session.userFirstName} a besoin d'aide !\nSuivez sa position : ${trackingUrl}\n\nAppuyez sur le lien - Urgences : 112 | Police : 17`,
  });

  logger.info(`📨 SMS envoyé`, { to: contact.phone, sid: message.sid });
  return message.sid;
};

/**
 * Envoie des alertes à tous les contacts d'une session
 * Détecte automatiquement WhatsApp ou SMS pour chaque contact
 */
export const sendAlertsToContacts = async (session: BeaverSession): Promise<Alert[]> => {
  const alerts: Alert[] = [];

  for (const contact of session.contacts) {
    try {
      // Détection du canal optimal
      const channel = await detectChannel(contact.phone);

      let twilioSid: string;
      if (channel === 'whatsapp') {
        twilioSid = await sendWhatsApp(contact, session);
      } else {
        twilioSid = await sendSms(contact, session);
      }

      const alert: Alert = {
        sessionId: session.sessionId,
        contactPhone: contact.phone,
        channel,
        status: 'sent',
        twilioSid,
        sentAt: Date.now(),
      };

      // Sauvegarde en Firestore
      await db.collection(COLLECTIONS.ALERTS).add(alert);
      alerts.push(alert);

      // Petite pause entre envois pour éviter rate limit Twilio
      await new Promise((resolve) => setTimeout(resolve, 200));

    } catch (error) {
      logger.error(`❌ Échec envoi alerte`, { contact: contact.phone, error });
      alerts.push({
        sessionId: session.sessionId,
        contactPhone: contact.phone,
        channel: 'sms',
        status: 'failed',
        sentAt: Date.now(),
      });
    }
  }

  // Enregistrement de l'heure d'envoi dans la session
  await db.collection(COLLECTIONS.SESSIONS).doc(session.sessionId).update({
    alertSentAt: Date.now(),
  });

  logger.info(`✅ ${alerts.filter((a) => a.status === 'sent').length}/${alerts.length} alertes envoyées`, {
    sessionId: session.sessionId,
  });

  return alerts;
};
