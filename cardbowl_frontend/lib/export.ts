import { BusinessCard, UserProfile } from "./storage";
import { Share } from "react-native";

export function generateVCard(card: BusinessCard): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
  ];

  if (card.name) lines.push(`FN:${card.name}`);
  if (card.title) lines.push(`TITLE:${card.title}`);
  if (card.company) lines.push(`ORG:${card.company}`);
  if (card.email) lines.push(`EMAIL;TYPE=WORK:${card.email}`);
  if (card.phone) lines.push(`TEL;TYPE=WORK:${card.phone}`);
  if (card.website) lines.push(`URL:${card.website}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${card.address};;;;`);
  if (card.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${card.linkedin}`);
  if (card.twitter) lines.push(`X-SOCIALPROFILE;TYPE=twitter:${card.twitter}`);
  if (card.instagram) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${card.instagram}`);
  if (card.category) lines.push(`X-CATEGORY:${card.category}`);
  if (card.keywords?.length) lines.push(`CATEGORIES:${card.keywords.join(",")}`);
  if (card.notes) lines.push(`NOTE:${card.notes.replace(/\n/g, "\\n")}`);
  if (card.location) {
    lines.push(`GEO:${card.location.latitude};${card.location.longitude}`);
  }

  lines.push(`REV:${card.savedAt}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function generateCSVRow(card: BusinessCard): string {
  const escape = (v?: string) => `"${(v || "").replace(/"/g, '""')}"`;
  return [
    escape(card.name),
    escape(card.title),
    escape(card.company),
    escape(card.email),
    escape(card.phone),
    escape(card.website),
    escape(card.address),
    escape(card.linkedin),
    escape(card.twitter),
    escape(card.instagram),
    escape(card.category),
    escape((card.keywords || []).join("; ")),
    escape(card.orgDescription),
    escape(card.notes),
    escape(card.savedAt),
  ].join(",");
}

export const CSV_HEADER =
  "Name,Title,Company,Email,Phone,Website,Address,LinkedIn,Twitter,Instagram,Category,Keywords,OrgDescription,Notes,SavedAt";

export async function shareCard(card: BusinessCard): Promise<void> {
  const vcard = generateVCard(card);
  const textSummary = [
    card.name && `👤 ${card.name}`,
    card.title && `💼 ${card.title}`,
    card.company && `🏢 ${card.company}`,
    card.email && `📧 ${card.email}`,
    card.phone && `📞 ${card.phone}`,
    card.website && `🌐 ${card.website}`,
    card.address && `📍 ${card.address}`,
    card.linkedin && `LinkedIn: ${card.linkedin}`,
    card.twitter && `Twitter: ${card.twitter}`,
  ]
    .filter(Boolean)
    .join("\n");

  await Share.share({
    title: `${card.name || card.company || "Contact"} – CardBowl`,
    message: `${textSummary}\n\n--- vCard ---\n${vcard}`,
  });
}

export async function shareMyCard(profile: UserProfile): Promise<void> {
  const lines = [
    profile.name && `👤 ${profile.name}`,
    profile.title && `💼 ${profile.title}`,
    profile.company && `🏢 ${profile.company}`,
    profile.email && `📧 ${profile.email}`,
    profile.phone && `📞 ${profile.phone}`,
    profile.website && `🌐 ${profile.website}`,
    profile.linkedin && `LinkedIn: ${profile.linkedin}`,
    profile.twitter && `Twitter: ${profile.twitter}`,
  ]
    .filter(Boolean)
    .join("\n");

  await Share.share({
    title: `${profile.name || "My Card"} – CardBowl`,
    message: `Here's my contact info:\n\n${lines}`,
  });
}

export async function shareAllCards(cards: BusinessCard[]): Promise<void> {
  const csv = [CSV_HEADER, ...cards.map(generateCSVRow)].join("\n");
  await Share.share({
    title: `CardBowl Export – ${cards.length} contacts`,
    message: csv,
  });
}
