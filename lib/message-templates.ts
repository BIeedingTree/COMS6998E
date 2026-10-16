import type { Category, MessageType } from "@/lib/drafts";
export type MessageTemplate = { label: string; text: string; category: Category; type: MessageType; recipient: string };
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  { category: "academic", type: "email", recipient: "Professor", label: "Ask for an extension", text: "Ask my professor for a two-day extension on the assignment without sounding irresponsible." },
  { category: "academic", type: "email", recipient: "Professor", label: "Follow up after office hours", text: "Thank my professor for their help during office hours and ask how I can keep building my understanding of the material." },
  { category: "academic", type: "email", recipient: "Other", label: "Email a TA", text: "Ask my TA to clarify what the assignment expects. I am unsure how much detail to include in my response." },
  { category: "academic", type: "email", recipient: "Professor", label: "Explain a missed class", text: "Tell my professor I missed class and ask how best to catch up. Do not invent a reason for my absence." },
  { category: "academic", type: "email", recipient: "Other", label: "Contact an adviser", text: "Ask my academic adviser for a meeting to discuss my course choices for next semester." },
  { category: "career", type: "email", recipient: "Recruiter", label: "Follow up with a recruiter", text: "Follow up with a recruiter who hasn't replied to my last message. Keep it interested but not pushy." },
  { category: "career", type: "email", recipient: "Other", label: "Thank an interviewer", text: "Thank someone for interviewing me and express my continued interest in the opportunity without inventing details about our conversation." },
  { category: "career", type: "email", recipient: "Other", label: "Ask an alum for coffee", text: "Introduce myself as a student to an alum and ask if they would have time for a brief coffee chat about their career path." },
  { category: "career", type: "email", recipient: "Other", label: "Networking follow-up", text: "Follow up with someone I met at a campus networking event and ask to stay in touch." },
  { category: "clubs", type: "email", recipient: "Other", label: "Message a club board", text: "Ask a student club's board how I can get involved and whether there are upcoming opportunities for new members." },
  { category: "clubs", type: "email", recipient: "Other", label: "Check on a club application", text: "Politely ask a student club about the status of my application without sounding impatient." },
  { category: "clubs", type: "message", recipient: "Group project", label: "Share the work fairly", text: "Ask a teammate who hasn't been contributing to take on a fair share of the remaining work. Be clear without being harsh." },
  { category: "housing", type: "message", recipient: "Roommate", label: "Talk to my roommate", text: "Ask my roommate to wash their dishes after cooking without starting a fight." },
  { category: "housing", type: "message", recipient: "Other", label: "Message an RA", text: "Ask my RA for a time to talk about a problem in our shared living space. Keep the details for our conversation." },
  { category: "housing", type: "message", recipient: "Roommate", label: "Ask for a quieter room", text: "Ask my roommate to keep the room quieter at night so I can sleep before my morning classes." },
  { category: "social", type: "message", recipient: "Friend", label: "Decline plans politely", text: "Tell a friend I can't make it to our plans this weekend without sounding dismissive." },
  { category: "social", type: "message", recipient: "Friend", label: "Fix an awkward text", text: "Clarify that my last text came across more bluntly than I intended and that I wasn't trying to be rude." },
  { category: "social", type: "message", recipient: "Friend", label: "Make an apology", text: "Apologize to a friend for not following through on our plans. Take responsibility without making excuses." },
  { category: "social", type: "message", recipient: "Date", label: "Ask someone out", text: "Ask someone I've enjoyed talking to if they'd like to get coffee together. Keep it warm and low-pressure." },
  { category: "career", type: "message", recipient: "Coworker", label: "Ask a coworker for help", text: "Ask a coworker for help with a task I'm stuck on without making it sound like I'm handing the work off to them." },
];

export function templatesFor(category: Category, recipient: string): MessageTemplate[] {
  if (category === "other" && !recipient) {
    return MESSAGE_TEMPLATES.filter((_, index) => [0, 5, 9, 12, 15, 16].includes(index));
  }
  return MESSAGE_TEMPLATES.filter(template =>
    (category === "other" || template.category === category) &&
    (!recipient || template.recipient === recipient)
  );
}
