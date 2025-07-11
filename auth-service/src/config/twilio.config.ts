// Basic configuration for Twilio
// In a real application, these values would come from environment variables.

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  twilioPhoneNumber: string; // Or Messaging Service SID
}

// Load configuration from environment variables or use placeholders
const twilioConfig: TwilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Placeholder
  authToken: process.env.TWILIO_AUTH_TOKEN || 'your_twilio_auth_token_placeholder', // Placeholder
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '+15551234567', // Placeholder Twilio phone number
};

export default twilioConfig;

// Helper function to check if Twilio is configured (optional, but good for warnings)
export const isTwilioConfigured = (): boolean => {
  return (
    !!twilioConfig.accountSid &&
    twilioConfig.accountSid !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' && // Not the placeholder
    !!twilioConfig.authToken &&
    twilioConfig.authToken !== 'your_twilio_auth_token_placeholder' && // Not the placeholder
    !!twilioConfig.twilioPhoneNumber &&
    twilioConfig.twilioPhoneNumber !== '+15551234567' // Not the placeholder
  );
};

// You would typically initialize the Twilio client here or in the service that uses it.
// For example:
// import twilio from 'twilio';
// const client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
// export { client as twilioClient };

console.log('[TwilioConfig] Loaded Twilio configuration.');
if (!isTwilioConfigured()) {
  console.warn(
    '[TwilioConfig] Twilio is not fully configured with actual credentials. OTP sending will be simulated or fail.'
  );
}
