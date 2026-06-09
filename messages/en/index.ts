import admin from "./admin.json";
import adminComponents from "./adminComponents.json";
import app from "./app.json";
import auth from "./auth.json";
import authComponents from "./authComponents.json";
import common from "./common.json";
import components from "./components.json";
import economy from "./economy.json";
import errors from "./errors.json";
import invite from "./invite.json";
import marketing from "./marketing.json";
import metadata from "./metadata.json";
import onboarding from "./onboarding.json";
import households from "./households.json";
import settings from "./settings.json";
import settingsForms from "./settingsForms.json";

const messages = {
  admin,
  adminComponents,
  app,
  auth,
  authComponents,
  common,
  components,
  economy,
  errors,
  invite,
  marketing,
  metadata,
  onboarding,
  households,
  settings,
  settingsForms,
} as const;

export default messages;

export type Messages = typeof messages;
