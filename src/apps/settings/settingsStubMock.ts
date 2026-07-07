/**
 * STUB: Settings content ported from UI Experiments / Longformer SettingsWorkspace.
 * Source: packages/longformer-demo-tailwind/src/mock-data/settings.ts
 */
import type { StubSettingsNavGroup, StubSettingsWorkspaceData } from "./settingsStubTypes";

const DEFAULT_WALLPAPER_URL =
  "https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?auto=compress&cs=tinysrgb&w=1920";

export const SETTINGS_STUB_NAV_GROUPS: StubSettingsNavGroup[] = [
  {
    id: "profile",
    title: "Profile",
    items: [
      {
        id: "account-info",
        label: "Account",
        children: [
          { id: "account-info", label: "Account Info" },
          { id: "password-security", label: "Password & Security" },
          { id: "account-standing", label: "Account Standing" },
          { id: "family-center", label: "Family Center" },
        ],
      },
      { id: "content-social", label: "Content & Social" },
      { id: "data-privacy", label: "Data & Privacy" },
      { id: "authorized-apps", label: "Authorized Apps" },
      { id: "connections", label: "Connections" },
      { id: "notifications", label: "Notifications" },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    items: [
      { id: "subscriptions", label: "Subscriptions" },
      { id: "gift-inventory", label: "Gift Inventory" },
      { id: "billing", label: "Billing" },
    ],
  },
  {
    id: "experience",
    title: "Experience",
    items: [
      { id: "wallpaper", label: "Wallpaper" },
      { id: "accessibility", label: "Accessibility" },
      { id: "voice-video", label: "Voice & Video" },
      { id: "text-images", label: "Text & Images" },
      { id: "notification-settings", label: "Notifications" },
      { id: "keybinds", label: "Keybinds" },
      { id: "language", label: "Language" },
      { id: "streamer-mode", label: "Streamer Mode" },
      { id: "advanced", label: "Advanced" },
    ],
  },
];

export const SETTINGS_STUB_DATA: StubSettingsWorkspaceData = {
  sections: [
    {
      id: "account-info",
      title: "Account Info",
      fields: [
        {
          id: "username",
          label: "Username",
          value: "stargazer3000",
          actions: [{ type: "edit", label: "Edit" }],
        },
        {
          id: "email",
          label: "Email",
          value: "stargazer@gmail.com",
          masked: true,
          maskedDisplay: "**********@gmail.com",
          actions: [
            { type: "reveal", label: "Reveal" },
            { type: "edit", label: "Edit" },
          ],
        },
        {
          id: "phone",
          label: "Phone Number",
          value: "+1 (415) 555-4451",
          masked: true,
          maskedDisplay: "********4451",
          actions: [
            { type: "reveal", label: "Reveal" },
            { type: "edit", label: "Edit" },
          ],
        },
      ],
    },
    {
      id: "password-security",
      title: "Password & Security",
      fields: [
        {
          id: "password",
          label: "Password",
          actions: [{ type: "edit", label: "Edit" }],
        },
      ],
      links: [
        { id: "mfa", label: "Multi-Factor Authentication", value: "Set up" },
        { id: "devices", label: "Logged-in Devices", value: "3 devices" },
      ],
    },
    {
      id: "account-standing",
      title: "Account Standing",
      standing: {
        status: "good",
        title: "Your account is all good",
        description:
          "Thanks for upholding our Terms of Service and Community Guidelines. [[link0]] and [[link1]] help keep our community safe.",
        linkLabels: ["Terms of Service", "Community Guidelines"],
      },
    },
    {
      id: "family-center",
      title: "Family Center",
      intro: "Manage parental controls, screen time, and linked family accounts.",
      links: [
        { id: "family-members", label: "Family members", value: "None linked", hint: "Invite a parent or guardian" },
        { id: "parental-controls", label: "Parental controls", value: "Off" },
      ],
    },
    {
      id: "content-social",
      title: "Content & Social",
      intro: "Control who can interact with you and what content you see.",
      toggles: [
        {
          id: "filter-explicit",
          label: "Filter explicit media content",
          description: "Automatically hide media that may contain explicit material.",
          enabled: true,
        },
        {
          id: "friend-requests",
          label: "Allow friend requests from server members",
          description: "Members of servers you share can send you friend requests.",
          enabled: true,
        },
        {
          id: "discoverable-email",
          label: "Discoverable by email",
          description: "Let people who know your email find and add you.",
          enabled: false,
        },
      ],
    },
    {
      id: "data-privacy",
      title: "Data & Privacy",
      intro: "Request your data, manage cookies, and control personalization.",
      links: [
        { id: "request-data", label: "Request all of my data", value: "Download" },
        { id: "cookies", label: "Cookie preferences", value: "Manage" },
        { id: "personalization", label: "Personalization", value: "On" },
      ],
      toggles: [
        {
          id: "usage-analytics",
          label: "Use data to improve the product",
          description: "Share anonymized usage data to help improve features.",
          enabled: true,
        },
      ],
    },
    {
      id: "authorized-apps",
      title: "Authorized Apps",
      intro: "Apps and integrations you've granted access to your account.",
      links: [
        { id: "spotify", label: "Spotify", value: "Connected", hint: "Listening activity shared" },
        { id: "github", label: "GitHub", value: "Connected", hint: "Profile linked" },
        { id: "figma", label: "Figma", value: "Revoke access", hint: "Last used 2 days ago" },
      ],
    },
    {
      id: "connections",
      title: "Connections",
      intro: "Link accounts to display on your profile and unlock integrations.",
      links: [
        { id: "connect-spotify", label: "Spotify", value: "Connected" },
        { id: "connect-steam", label: "Steam", value: "Connect" },
        { id: "connect-x", label: "X", value: "Connect" },
        { id: "connect-twitch", label: "Twitch", value: "Connect" },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
      intro: "Choose how and when you get notified across devices.",
      toggles: [
        {
          id: "desktop-notifications",
          label: "Enable desktop notifications",
          description: "Show notifications while the app is open.",
          enabled: true,
        },
        {
          id: "mention-notifications",
          label: "@mentions",
          description: "Notify when someone mentions you.",
          enabled: true,
        },
        {
          id: "message-notifications",
          label: "Direct messages",
          description: "Notify for new direct messages.",
          enabled: true,
        },
      ],
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      links: [
        { id: "active-subs", label: "Active subscriptions", value: "1 active" },
        { id: "payment-method", label: "Payment method", value: "Visa •••• 4242" },
      ],
    },
    {
      id: "gift-inventory",
      title: "Gift Inventory",
      intro: "Redeem or share gifts you've received.",
      links: [{ id: "unused-gifts", label: "Unused gifts", value: "None" }],
    },
    {
      id: "billing",
      title: "Billing",
      links: [
        { id: "billing-history", label: "Billing history", value: "View" },
        { id: "billing-address", label: "Billing address", value: "Edit" },
        { id: "tax-info", label: "Tax information", value: "Add" },
      ],
    },
    {
      id: "wallpaper",
      title: "Wallpaper",
      intro: "Pick a background for the simulated desktop shells.",
    },
    {
      id: "accessibility",
      title: "Accessibility",
      toggles: [
        {
          id: "reduce-motion",
          label: "Reduced motion",
          description: "Minimize animations throughout the app.",
          enabled: false,
        },
        {
          id: "high-contrast",
          label: "High contrast",
          description: "Increase contrast for text and UI elements.",
          enabled: false,
        },
        {
          id: "screen-reader",
          label: "Screen reader optimizations",
          description: "Improve compatibility with assistive technologies.",
          enabled: true,
        },
      ],
    },
    {
      id: "voice-video",
      title: "Voice & Video",
      links: [
        { id: "input-device", label: "Input device", value: "MacBook Pro Microphone" },
        { id: "output-device", label: "Output device", value: "MacBook Pro Speakers" },
        { id: "camera", label: "Camera", value: "FaceTime HD Camera" },
      ],
      toggles: [
        {
          id: "noise-suppression",
          label: "Noise suppression",
          description: "Reduce background noise on voice calls.",
          enabled: true,
        },
        {
          id: "echo-cancellation",
          label: "Echo cancellation",
          enabled: true,
        },
      ],
    },
    {
      id: "text-images",
      title: "Text & Images",
      toggles: [
        { id: "link-preview", label: "Show embeds and link previews", enabled: true },
        { id: "animated-emoji", label: "Play animated emoji", enabled: true },
        {
          id: "gif-autoplay",
          label: "Automatically play GIFs",
          description: "GIFs play when messages come into view.",
          enabled: false,
        },
      ],
    },
    {
      id: "notification-settings",
      title: "Notifications",
      toggles: [
        { id: "badge-counts", label: "Enable unread message badge", enabled: true },
        { id: "sound-effects", label: "Notification sounds", enabled: true },
        {
          id: "focus-mode",
          label: "Focus mode",
          description: "Silence notifications during scheduled hours.",
          enabled: false,
        },
      ],
    },
    {
      id: "keybinds",
      title: "Keybinds",
      intro: "Customize keyboard shortcuts for common actions.",
      links: [
        { id: "toggle-mute", label: "Toggle mute", value: "⌘ Shift M" },
        { id: "toggle-deafen", label: "Toggle deafen", value: "⌘ Shift D" },
        { id: "push-to-talk", label: "Push to talk", value: "Not set" },
      ],
    },
    {
      id: "language",
      title: "Language",
      links: [
        { id: "app-language", label: "Language", value: "English, US" },
        { id: "spellcheck", label: "Spellcheck", value: "English (United States)" },
      ],
    },
    {
      id: "streamer-mode",
      title: "Streamer Mode",
      intro: "Hide personal information while streaming or sharing your screen.",
      toggles: [
        {
          id: "streamer-mode-enabled",
          label: "Enable Streamer Mode",
          description: "Hide invite links, emails, and other sensitive info.",
          enabled: false,
        },
        { id: "hide-preview", label: "Hide preview window", enabled: true },
      ],
    },
    {
      id: "advanced",
      title: "Advanced",
      toggles: [
        {
          id: "hardware-acceleration",
          label: "Hardware acceleration",
          description: "Use GPU rendering when available.",
          enabled: true,
        },
        {
          id: "developer-mode",
          label: "Developer mode",
          description: "Expose extra tools for building apps and bots.",
          enabled: false,
        },
      ],
      links: [{ id: "clear-cache", label: "Clear cache", value: "Clear" }],
    },
  ],
  wallpaperPresets: [
    {
      id: "talisker-bay",
      label: "Talisker Bay",
      url: DEFAULT_WALLPAPER_URL,
      credit: "Aaron Mridha · Pexels",
    },
    {
      id: "aurora",
      label: "Northern lights",
      url: "https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg?auto=compress&cs=tinysrgb&w=1920",
      credit: "Vincent Rivaud · Pexels",
    },
    {
      id: "desert-dunes",
      label: "Desert dunes",
      url: "https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=1920",
      credit: "Alex Azabache · Pexels",
    },
    {
      id: "solid-dark",
      label: "Solid dark",
      url: "https://images.pexels.com/photos/325044/pexels-photo-325044.jpeg?auto=compress&cs=tinysrgb&w=1920",
      credit: "Minimal gradient",
    },
  ],
};

export const ACCOUNT_STUB_SECTION_IDS = [
  "account-info",
  "password-security",
  "account-standing",
  "family-center",
] as const;
