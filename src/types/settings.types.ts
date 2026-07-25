/**
 * Owner-editable system settings, mirroring the backend's typed registry
 * (agritrade-backend `src/config/settings-registry.ts`). The GET/PATCH
 * endpoints both return every resolved value plus per-key descriptions for
 * labelling the form.
 */
export interface ISystemSettings {
  companyContactAddress: string;
  companyContactEmail: string;
  companyContactPhone: string;
  companyContactWhatsapp: string;
  lowFloatThresholdGhs: number;
  purchaseApprovalThresholdGhs: number;
}

export type SettingKey = keyof ISystemSettings;

export interface ISettingsResponse {
  message: string;
  data: {
    settings: ISystemSettings;
    descriptions: Record<SettingKey, string>;
  };
}

/** PATCH body: any subset of the settings (only changed keys are sent). */
export type IUpdateSettingsInput = Partial<ISystemSettings>;
