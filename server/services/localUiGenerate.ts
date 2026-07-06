/**
 * Deterministic openui-lang synthesis for the Generator — rich inline-chat
 * surfaces without calling an LLM. Used for mock mode, instant matches, and
 * as a fallback when the model returns empty or invalid code.
 */
import { titleFromPrompt } from "../../shared/generator/extractOpenUi.js";

function matches(prompt: string, keywords: string[]): boolean {
  const normalized = prompt.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

export interface LocalUiResult {
  title: string;
  code: string;
}

export function tryLocalUiGenerate(prompt: string): LocalUiResult | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;
  const title = titleFromPrompt(trimmed);

  if (matches(trimmed, ["login", "sign in", "sign-in", "password"])) {
    return {
      title: title || "Login Form",
      code: `root = Card([title, form])
title = TextContent("Sign in", "large-heavy")
form = Form("login", btns, [emailField, passField, rememberField])
emailField = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
passField = FormControl("Password", Input("password", "••••••••", "password", { required: true, minLength: 8 }))
rememberField = FormControl("Remember me", SwitchItem("remember", "Keep me signed in", true))
btns = Buttons([Button("Sign in", Action([@ToAssistant("Sign in")]), "primary")])`,
    };
  }

  if (matches(trimmed, ["pricing", "plan", "subscription", "pro plan", "cta"])) {
    return {
      title: title || "Pricing Card",
      code: `root = Card([hdr, price, feats, cta])
hdr = CardHeader("Pro", "Everything you need to ship")
price = TextContent("$29 / month", "large-heavy")
feats = ListBlock([f1, f2, f3])
f1 = ListItem("Unlimited projects", "Create without limits")
f2 = ListItem("Priority support", "Fast responses from the team")
f3 = ListItem("Advanced analytics", "Trends and breakdowns")
cta = Buttons([Button("Start trial", Action([@ToAssistant("Start trial")]), "primary")])`,
    };
  }

  if (matches(trimmed, ["contact", "message", "get in touch", "support"])) {
    return {
      title: title || "Contact Form",
      code: `root = Card([title, form])
title = TextContent("Contact us", "large-heavy")
form = Form("contact", btns, [nameField, emailField, msgField])
nameField = FormControl("Name", Input("name", "Your name", "text", { required: true, minLength: 2 }))
emailField = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
msgField = FormControl("Message", TextArea("message", "How can we help?", 4, { required: true, minLength: 10 }))
btns = Buttons([Button("Submit", Action([@ToAssistant("Submit contact form")]), "primary")])`,
    };
  }

  if (matches(trimmed, ["newsletter", "subscribe", "signup", "sign up"])) {
    return {
      title: title || "Newsletter Signup",
      code: `root = Card([hdr, form])
hdr = CardHeader("Stay in the loop", "Monthly product updates — no spam")
form = Form("newsletter", btns, [emailField])
emailField = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
btns = Buttons([Button("Subscribe", Action([@ToAssistant("Subscribe")]), "primary")])`,
    };
  }

  if (matches(trimmed, ["headphones", "product card", "add to cart", "wireless", "product"])) {
    return {
      title: title || "Product Card",
      code: `root = Card([hdr, img, body, priceRow, cta, tags])
hdr = CardHeader("Wireless Headphones", "Noise-cancelling · 30h battery")
img = ImageBlock("https://picsum.photos/seed/headphones/640/400", "Wireless headphones on a desk")
body = TextContent("Premium over-ear headphones with adaptive noise cancellation and a travel case.", "default")
priceRow = TextContent("$249 · Free shipping", "large-heavy")
tags = TagBlock(["Audio", "Featured"])
cta = Buttons([Button("Add to cart", Action([@ToAssistant("Add to cart")]), "primary")])`,
    };
  }

  if (matches(trimmed, ["profile", "settings", "avatar", "account"])) {
    return {
      title: title || "Profile Settings",
      code: `root = Card([hdr, form])
hdr = CardHeader("Profile", "Update your account details")
form = Form("profile", btns, [nameField, emailField, bioField])
nameField = FormControl("Display name", Input("name", "Alex Chen", "text", { required: true, minLength: 2 }))
emailField = FormControl("Email", Input("email", "alex@example.com", "email", { required: true, email: true }))
bioField = FormControl("Bio", TextArea("bio", "Tell people about yourself", 3))
btns = Buttons([Button("Save changes", Action([@ToAssistant("Save profile")]), "primary")])`,
    };
  }

  if (matches(trimmed, ["chart", "graph", "dashboard", "metric", "analytics", "kpi"])) {
    return {
      title: title || "Metrics Dashboard",
      code: `root = Card([hdr, chart, stats, follow])
hdr = CardHeader("Overview", "Key metrics this week")
chart = BarChart(["Mon", "Tue", "Wed", "Thu"], [Series("Signups", [12, 18, 9, 22])])
stats = Table([Col("Metric", labels), Col("Value", values)])
labels = ["Active users", "Conversion"]
values = ["12,480", "3.2%"]
follow = FollowUpBlock([fu1, fu2])
fu1 = FollowUpItem("Break this down by channel")
fu2 = FollowUpItem("Show a trend line instead")`,
    };
  }

  if (matches(trimmed, ["table", "leaderboard", "comparison", "rank", "languages"])) {
    return {
      title: title || "Comparison Table",
      code: `root = Card([title, tbl, followUps])
title = TextContent("Top Languages", "large-heavy")
tbl = Table([Col("Language", langs), Col("Users (M)", users), Col("Year", years)])
langs = ["Python", "JavaScript", "Java"]
users = [15.7, 14.2, 12.1]
years = [1991, 1995, 1995]
followUps = FollowUpBlock([fu1, fu2])
fu1 = FollowUpItem("Tell me more about Python")
fu2 = FollowUpItem("Show me a JavaScript comparison")`,
    };
  }

  if (matches(trimmed, ["list", "topics", "choose", "menu", "options"])) {
    return {
      title: title || "Topic List",
      code: `root = Card([title, list])
title = TextContent("Choose a topic", "large-heavy")
list = ListBlock([item1, item2, item3])
item1 = ListItem("Getting started", "New to the platform? Start here.")
item2 = ListItem("Advanced features", "Deep dives into powerful capabilities.")
item3 = ListItem("Troubleshooting", "Common issues and how to fix them.")`,
    };
  }

  if (matches(trimmed, ["carousel", "gallery", "destinations", "travel", "featured"])) {
    return {
      title: title || "Featured Carousel",
      code: `root = Card([header, carousel, followups])
header = CardHeader("Featured Destinations", "Discover highlights and best time to visit")
carousel = Carousel([[t1, img1, d1, tags1], [t2, img2, d2, tags2]], "card")
t1 = TextContent("Paris, France", "large-heavy")
img1 = ImageBlock("https://picsum.photos/seed/paris/800/500", "Eiffel Tower at night")
d1 = TextContent("City of light — best Apr–Jun and Sep–Oct.", "default")
tags1 = TagBlock(["Landmark", "City Break"])
t2 = TextContent("Kyoto, Japan", "large-heavy")
img2 = ImageBlock("https://picsum.photos/seed/kyoto/800/500", "Bamboo grove")
d2 = TextContent("Temples and bamboo groves — best Mar–Apr and Nov.", "default")
tags2 = TagBlock(["Culture", "Nature"])
followups = FollowUpBlock([fu1])
fu1 = FollowUpItem("Plan a trip to Paris")`,
    };
  }

  if (matches(trimmed, ["form"])) {
    return tryLocalUiGenerate("contact form with name email and message")!;
  }

  return null;
}

/** Rich fallback when no pattern matches — still better than a placeholder card. */
export function fallbackLocalUiGenerate(prompt: string): LocalUiResult {
  const title = titleFromPrompt(prompt);
  return {
    title: title || "Generated UI",
    code: `root = Card([hdr, intro, list, follow])
hdr = CardHeader("${title || "Generated UI"}", "Composed from your prompt")
intro = TextContent("This surface combines headings, a list, and follow-up chips using the inline chat library.", "default")
list = ListBlock([item1, item2])
item1 = ListItem("Preview in place", "Iterate on layout and copy here.")
item2 = ListItem("Refine in Studio", "Open Studio to evolve this into a durable app.")
follow = FollowUpBlock([fu1, fu2])
fu1 = FollowUpItem("Make this more compact")
fu2 = FollowUpItem("Turn this into a durable app")`,
  };
}
