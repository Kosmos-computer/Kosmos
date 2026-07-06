/** Minimal valid openui-lang snippets for inline-chat catalog previews. */
export function snippetForComponent(name: string): string {
  switch (name) {
    case "CardHeader":
      return `root = Card([hdr])\nhdr = CardHeader("Title", "Subtitle")`;
    case "TextContent":
      return `root = Card([txt])\ntxt = TextContent("Hello world", "large-heavy")`;
    case "MarkDownRenderer":
      return `root = Card([md])\nmd = MarkDownRenderer("**Bold** and _italic_ prose.")`;
    case "Callout":
      return `root = Card([callout])\ncallout = Callout("Heads up", "This is an informational callout.", "info")`;
    case "TextCallout":
      return `root = Card([callout])\ncallout = TextCallout("Short highlight text", "default")`;
    case "Image":
      return `root = Card([img])\nimg = Image("https://picsum.photos/seed/arco/640/360", "Sample image")`;
    case "ImageBlock":
      return `root = Card([img])\nimg = ImageBlock("https://picsum.photos/seed/arco/640/360", "Sample image")`;
    case "ImageGallery":
      return `root = Card([gallery])\ngallery = ImageGallery(["https://picsum.photos/seed/a/320/240", "https://picsum.photos/seed/b/320/240"], "Gallery")`;
    case "CodeBlock":
      return `root = Card([code])\ncode = CodeBlock("console.log('hello')", "javascript")`;
    case "Separator":
      return `root = Card([top, sep, bottom])\ntop = TextContent("Above", "default")\nsep = Separator()\nbottom = TextContent("Below", "default")`;
    case "Table":
      return `root = Card([tbl])\ntbl = Table([Col("Name", names), Col("Score", scores)])\nnames = ["Ada", "Grace"]\nscores = [98, 95]`;
    case "Col":
      return `root = Card([tbl])\ntbl = Table([Col("Item", items)])\nitems = ["One", "Two"]`;
    case "BarChart":
      return `root = Card([chart])\nchart = BarChart(["A", "B", "C"], [Series("Values", [3, 7, 5])])`;
    case "LineChart":
      return `root = Card([chart])\nchart = LineChart(["Jan", "Feb", "Mar"], [Series("Trend", [2, 5, 4])])`;
    case "AreaChart":
      return `root = Card([chart])\nchart = AreaChart(["Jan", "Feb", "Mar"], [Series("Trend", [2, 5, 4])])`;
    case "PieChart":
      return `root = Card([chart])\nchart = PieChart(["Done", "Open"], [12, 8])`;
    case "Form":
      return `root = Card([form])\nform = Form("demo", btns, [field])\nfield = FormControl("Email", Input("email", "you@example.com", "email"))\nbtns = Buttons([Button("Submit", Action([@ToAssistant("Submit")]), "primary")])`;
    case "FormControl":
      return `root = Card([field])\nfield = FormControl("Email", Input("email", "you@example.com", "email"))`;
    case "Label":
      return `root = Card([field])\nfield = FormControl("Name", Input("name", "Your name", "text"))`;
    case "Input":
      return `root = Card([field])\nfield = FormControl("Email", Input("email", "you@example.com", "email"))`;
    case "TextArea":
      return `root = Card([field])\nfield = FormControl("Message", TextArea("message", "Tell us more...", 4))`;
    case "Select":
      return `root = Card([field])\nfield = FormControl("Plan", Select("plan", [opt1, opt2], "Choose a plan"))\nopt1 = SelectItem("pro", "Pro")\nopt2 = SelectItem("team", "Team")`;
    case "SelectItem":
      return `root = Card([field])\nfield = FormControl("Plan", Select("plan", [opt], "Choose"))\nopt = SelectItem("pro", "Pro")`;
    case "Button":
      return `root = Card([btn])\nbtn = Button("Primary action", Action([@ToAssistant("Clicked")]), "primary")`;
    case "Buttons":
      return `root = Card([btns])\nbtns = Buttons([Button("Save", Action([@ToAssistant("Save")]), "primary"), Button("Cancel", Action([@ToAssistant("Cancel")]), "secondary")])`;
    case "ListBlock":
      return `root = Card([list])\nlist = ListBlock([item1, item2])\nitem1 = ListItem("Getting started", "New here? Start with the basics.")\nitem2 = ListItem("Advanced", "Power features and tips.")`;
    case "ListItem":
      return `root = Card([list])\nlist = ListBlock([item])\nitem = ListItem("List item", "Supporting description")`;
    case "FollowUpBlock":
      return `root = Card([follow])\nfollow = FollowUpBlock([fu1, fu2])\nfu1 = FollowUpItem("Tell me more")\nfu2 = FollowUpItem("Show an example")`;
    case "FollowUpItem":
      return `root = Card([follow])\nfollow = FollowUpBlock([fu])\nfu = FollowUpItem("Suggested next step")`;
    case "SectionBlock":
      return `root = Card([section])\nsection = SectionBlock([sec1, sec2])\nsec1 = SectionItem("overview", "Overview", [TextContent("Summary copy", "default")])\nsec2 = SectionItem("details", "Details", [TextContent("More detail", "default")])`;
    case "SectionItem":
      return `root = Card([section])\nsection = SectionBlock([sec])\nsec = SectionItem("details", "Details", [TextContent("Section body", "default")])`;
    case "Tabs":
      return `root = Card([tabs])\ntabs = Tabs([tab1, tab2])\ntab1 = TabItem("one", "Overview", [TextContent("Overview tab", "default")])\ntab2 = TabItem("two", "Details", [TextContent("Details tab", "default")])`;
    case "TabItem":
      return `root = Card([tabs])\ntabs = Tabs([tab])\ntab = TabItem("one", "Overview", [TextContent("Tab content", "default")])`;
    case "Accordion":
      return `root = Card([acc])\nacc = Accordion([item1, item2])\nitem1 = AccordionItem("a", "First", [TextContent("First panel", "default")])\nitem2 = AccordionItem("b", "Second", [TextContent("Second panel", "default")])`;
    case "AccordionItem":
      return `root = Card([acc])\nacc = Accordion([item])\nitem = AccordionItem("a", "Section", [TextContent("Panel body", "default")])`;
    case "Steps":
      return `root = Card([steps])\nsteps = Steps([step1, step2, step3])\nstep1 = StepsItem("Plan", "Define requirements")\nstep2 = StepsItem("Build", "Implement the UI")\nstep3 = StepsItem("Ship", "Publish to the catalog")`;
    case "StepsItem":
      return `root = Card([steps])\nsteps = Steps([step])\nstep = StepsItem("Step", "Description")`;
    case "Carousel":
      return `root = Card([carousel])\ncarousel = Carousel([[title, body], [title2, body2]], "card")\ntitle = TextContent("Slide one", "large-heavy")\nbody = TextContent("Carousel body copy", "default")\ntitle2 = TextContent("Slide two", "large-heavy")\nbody2 = TextContent("More carousel content", "default")`;
    case "TagBlock":
      return `root = Card([tags])\ntags = TagBlock(["Design", "UI", "Arco"])`;
    case "Tag":
      return `root = Card([tags])\ntags = TagBlock(["Info"])`;
    default:
      return `root = Card([txt])\ntxt = TextContent("${name}", "default")`;
  }
}
