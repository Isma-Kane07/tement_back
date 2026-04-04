// services/notificationService.js
const { messaging } = require('./firebase');
const { Utilisateur } = require('../models');

class NotificationService {
  
  async sendToUser(userId, notification, data = {}) {
    try {
      const user = await Utilisateur.findByPk(userId, {
        attributes: ['id', 'fcmToken', 'nom']
      });
      
      if (!user || !user.fcmToken) {
        console.log(`❌ Utilisateur ${userId} n'a pas de token FCM`);
        return false;
      }

      const message = {
        token: user.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...data,
          userId: user.id.toString(),
          userName: user.nom,
          timestamp: Date.now().toString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'tement_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      await messaging.send(message);
      console.log(`✅ Notification envoyée à ${user.nom}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error.message);
      return false;
    }
  }

  async saveFcmToken(userId, fcmToken) {
    try {
      await Utilisateur.update(
        { fcmToken: fcmToken },
        { where: { id: userId } }
      );
      console.log(`✅ Token FCM sauvegardé pour l'utilisateur ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde token:', error.message);
      return false;
    }
  }
}

module.exports = new NotificationService();