import * as Linking from 'expo-linking';

/**
 * Check if SMS is available on device (fallback without expo-sms)
 */
export async function isSMSAvailable(): Promise<boolean> {
  try {
    // Check if we can open SMS URLs
    return await Linking.canOpenURL('sms:');
  } catch (error) {
    console.error('Error checking SMS availability:', error);
    return false;
  }
}

/**
 * Send an invite SMS with pre-filled message (using URL scheme)
 */
export async function sendInviteSMS(
  phoneNumber: string,
  inviteCode: string,
  inviterName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = createInviteMessage(inviteCode, inviterName);
    const encodedMessage = encodeURIComponent(message);
    const smsUrl = `sms:${phoneNumber}?body=${encodedMessage}`;

    const canOpen = await Linking.canOpenURL(smsUrl);
    if (!canOpen) {
      return { success: false, error: 'SMS not available on this device' };
    }

    await Linking.openURL(smsUrl);
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: 'Failed to send SMS' };
  }
}

/**
 * Create invite message text
 */
export function createInviteMessage(inviteCode: string, inviterName: string): string {
  // Create deep link (in production, this would be your actual app link)
  const appLink = `https://salvo.app/invite/${inviteCode}`;

  return `${inviterName} invited you to join Salvo!

Use invite code: ${inviteCode}

Download the app and enter this code to get bonus XP:
${appLink}

Join the mission! ⚔️`;
}

/**
 * Share invite via share sheet (alternative to SMS)
 */
export async function shareInvite(
  inviteCode: string,
  inviterName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { Share } = await import('react-native');
    const message = createInviteMessage(inviteCode, inviterName);

    const result = await Share.share({
      message,
      title: 'Join me on Salvo!',
    });

    if (result.action === Share.sharedAction) {
      return { success: true };
    } else {
      return { success: false, error: 'Share cancelled' };
    }
  } catch (error) {
    console.error('Error sharing invite:', error);
    return { success: false, error: 'Failed to share invite' };
  }
}

/**
 * Open SMS app with pre-filled message (fallback method)
 */
export async function openSMSAppWithMessage(
  phoneNumber: string,
  inviteCode: string,
  inviterName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = createInviteMessage(inviteCode, inviterName);
    const encodedMessage = encodeURIComponent(message);

    // SMS URL scheme
    const smsUrl = `sms:${phoneNumber}?body=${encodedMessage}`;

    const canOpen = await Linking.canOpenURL(smsUrl);

    if (!canOpen) {
      return { success: false, error: 'Cannot open SMS app' };
    }

    await Linking.openURL(smsUrl);
    return { success: true };
  } catch (error) {
    console.error('Error opening SMS app:', error);
    return { success: false, error: 'Failed to open SMS app' };
  }
}
