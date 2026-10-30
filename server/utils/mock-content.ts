// Help content for the mock API: the FAQ and the legal documents. Placeholder wording that matches how the prototype
// plays (withdrawals, one payment method per account, provably fair rolls): the final legal text comes from counsel.
import type { ContactBody, ContactResponse, FaqResponse, LegalDoc, LegalSlug } from '#shared/types/api'
import { MockError } from './mock-db'

const FAQ: FaqResponse = {
  groups: [
    {
      id: 'start',
      title: 'Getting started',
      icon: 'info',
      items: [
        { q: 'What is KurwaDROP?', a: 'A CS2 case opening site. You top up with coins, open cases, upgrade what you drop or play it in PvP battles, then sell skins for coins or withdraw them to Steam.' },
        { q: 'How do I sign in?', a: 'With your Steam account. We never see your Steam password: the sign-in happens on Steam’s own page.' },
        { q: 'Who can play?', a: 'Adults only: you must be 18 or older, and the laws of your country must allow it. We can ask you to confirm your age at any time.' },
        { q: 'What are coins?', a: 'The site’s balance. Case prices, upgrades, battles and skin values are all shown in coins. The deposit page shows exactly how many coins you get before you pay.' },
      ],
    },
    {
      id: 'cases',
      title: 'Cases',
      icon: 'cases',
      items: [
        { q: 'How does opening a case work?', a: 'Pick a case, choose how many to open, and spin. The drop is decided by your seeds the moment you open it: the reel only shows a result that already exists.' },
        { q: 'Where can I see the odds?', a: 'On every case page, next to its list of skins. Each skin shows its chance of dropping.' },
        { q: 'What happens to a skin I dropped?', a: 'It lands in your inventory. From there you can sell it for coins, use it in an upgrade or withdraw it to Steam.' },
        { q: 'Why do some cases have a timer?', a: 'Those cases are limited in time: the timer shows when they leave the site. When it reaches zero the case is gone, nothing is hidden behind it.' },
      ],
    },
    {
      id: 'upgrade',
      title: 'Upgrade',
      icon: 'upgrade',
      items: [
        { q: 'What is an upgrade?', a: 'You stake skins, coins or both for a chance at a more expensive skin. If the roll lands inside your chance, the new skin is yours. If not, the stake is gone.' },
        { q: 'How is the chance worked out?', a: 'From the stake and the target’s price, shown before you spin. The upgrade page explains the formula under How it works.' },
        { q: 'Can I get my stake back after a lost upgrade?', a: 'No. Every roll is final, and you can check it on the Provably Fair page.' },
      ],
    },
    {
      id: 'pvp',
      title: 'PvP battles',
      icon: 'pvp',
      items: [
        { q: 'How does a battle work?', a: 'Everyone pays the same price and opens the same cases, round by round. The mode decides who takes the drops: Classic the most value, Crazy the least, 2 vs 2 the team with more.' },
        { q: 'Can I leave a battle?', a: 'No. Your entry is paid when you take a seat, and the battle plays to the end. The creator can fill empty seats with bots.' },
        { q: 'Who decides the luck in a battle?', a: 'A public EOS block named when the last seat fills. Nobody knows it in advance, us included, and every battle can be checked once it ends.' },
      ],
    },
    {
      id: 'wallet',
      title: 'Deposits',
      icon: 'wallet',
      items: [
        { q: 'How do I top up?', a: 'Open Deposit, pick a payment method and an amount, and add a promo code if you have one. You see the coins you will receive before you pay.' },
        { q: 'Why was my deposit cancelled?', a: 'Most often the payment method is used on another account. Each method can belong to one account only.' },
        { q: 'My payment went through but the coins did not arrive', a: 'Give it a few minutes, then write to us with the time and the amount. Keep the receipt from your bank or payment provider.' },
        { q: 'Can I get a deposit refunded?', a: 'The Refund Policy covers when that is possible. In short: coins you have already played with cannot be refunded.' },
      ],
    },
    {
      id: 'withdraw',
      title: 'Withdrawals',
      icon: 'steam',
      items: [
        { q: 'How do I withdraw a skin?', a: 'Pick the skin in your inventory and press Withdraw. It goes out as a Steam trade offer to the trade link you saved.' },
        { q: 'Can I withdraw several skins at once?', a: 'No, skins leave one at a time. Each gets its own trade offer.' },
        { q: 'Where do I find my trade link?', a: 'In Steam: Inventory → Trade offers → Who can send me trade offers. Paste it on your profile or in the withdrawal window.' },
        { q: 'What if I miss the trade offer?', a: 'An offer waits 15 minutes. If you do not accept it in time, the skin comes back to your inventory.' },
        { q: 'Why did my withdrawal fail?', a: 'Usually an old trade link, a private inventory or a Steam trade hold on your account. Check them in Steam and try again.' },
      ],
    },
    {
      id: 'fair',
      title: 'Fairness and account',
      icon: 'shield',
      items: [
        { q: 'What does provably fair mean?', a: 'Every roll comes from a server seed, your own client seed and a counter. We show the seed’s hash before you play, so the result cannot be changed afterwards, and you can recheck any roll yourself.' },
        { q: 'Where do I check a roll?', a: 'Press Check next to the roll in your history, or open the Provably Fair page.' },
        { q: 'How do I close my account or take a break?', a: 'Write to us from the Contact page and we will close the account or pause it for the time you choose.' },
      ],
    },
  ],
}

const UPDATED = '2026-10-01T00:00:00.000Z'
const LEGAL: Record<LegalSlug, LegalDoc> = {
  terms: {
    slug: 'terms',
    updatedAt: UPDATED,
    sections: [
      { id: 'agreement', title: 'Agreement', paragraphs: ['These terms are a contract between you and Company Ltd (REG 000000), Street 1, City, Country, the operator of KurwaDROP. By signing in you accept them. If you do not agree, do not use the site.'] },
      { id: 'eligibility', title: 'Who can use the site', paragraphs: ['You must be at least 18 years old and allowed by the laws of your country to use services like this one. You are responsible for checking this.', 'You may hold one account. It is personal: you may not sell it, share it or play for someone else.'] },
      { id: 'coins', title: 'Coins and balance', paragraphs: ['Coins are the site’s internal balance. They have no value outside KurwaDROP, they are not money and they earn no interest.', 'We may correct a balance that is wrong because of a technical error, and we will tell you when we do.'] },
      { id: 'games', title: 'Cases, upgrades and battles', paragraphs: ['The chance of every outcome is shown before you play. Results come from the provably fair system described on the Provably Fair page, and a played round is final.', 'Using bots, exploiting errors or working with other players to influence a result is not allowed.'] },
      { id: 'items', title: 'Skins', paragraphs: ['Skins in your inventory can be sold for coins, used in upgrades or withdrawn to Steam. Prices follow the market and can change at any time.', 'Skins are withdrawn one at a time as a Steam trade offer, which you must accept within 15 minutes. Valve is not connected with KurwaDROP.'] },
      { id: 'closing', title: 'Suspending and closing accounts', paragraphs: ['We can suspend or close an account that breaks these terms or the AML Policy. Where the law allows it, we can hold the balance while we look into the case.', 'You can close your account at any time from the Contact page.'] },
      { id: 'liability', title: 'Liability', paragraphs: ['We provide the site as it is and do not promise that it will always be available. Nothing in these terms limits a liability that the law does not allow us to limit.'] },
      { id: 'changes', title: 'Changes', paragraphs: ['We can change these terms. We will show the new date at the top of this page, and tell you first about a change that matters. If you keep playing, you accept the new terms.'] },
    ],
  },
  privacy: {
    slug: 'privacy',
    updatedAt: UPDATED,
    sections: [
      { id: 'who', title: 'Who handles your data', paragraphs: ['Company Ltd (REG 000000), Street 1, City, Country is the data controller. Write to us from the Contact page with any privacy question.'] },
      { id: 'collect', title: 'What we collect', paragraphs: ['From Steam: your SteamID, nickname and avatar. From you: your trade link and anything you send us. From your play: deposits, rolls, skins and history. From your device: IP address, browser and language.', 'We never receive your Steam password. Card details go directly to the licensed payment provider.'] },
      { id: 'why', title: 'Why we use it', paragraphs: ['To run your account, process payments and withdrawals, keep the games fair, stop fraud, meet our legal duties and answer your messages.'] },
      { id: 'sharing', title: 'Who we share it with', paragraphs: ['Payment providers, Steam for trade offers, identity check services, hosting and support tools, and authorities when the law requires it. We do not sell your data.'] },
      { id: 'keeping', title: 'How long we keep it', paragraphs: ['As long as your account is open, then for as long as the law requires us to keep financial and anti-money laundering records.'] },
      { id: 'rights', title: 'Your rights', paragraphs: ['You can ask for a copy of your data, ask us to correct or delete it, object to how we use it, and complain to your data protection authority.'] },
      { id: 'cookies', title: 'Cookies', paragraphs: ['Necessary cookies keep you signed in and remember your choices: the site does not work without them. Analytics cookies help us understand how the site is used, and we set them only with your OK.', 'You can change your choice at any time under Cookie settings in the footer.'] },
    ],
  },
  aml: {
    slug: 'aml',
    updatedAt: UPDATED,
    sections: [
      { id: 'purpose', title: 'Purpose', paragraphs: ['We do not accept money laundering, terrorist financing or fraud on KurwaDROP. This policy explains how we prevent them and what we can ask of you.'] },
      { id: 'one-method', title: 'One payment method per account', paragraphs: ['Every payment method can belong to one account only, and it must be in your own name. Deposits from a method shared between accounts are cancelled.'] },
      { id: 'checks', title: 'Identity checks', paragraphs: ['We can ask you to confirm your identity, your address and the source of your funds, for example before a large withdrawal. Until the check is done we can pause deposits and withdrawals.'] },
      { id: 'monitoring', title: 'Monitoring', paragraphs: ['We watch for unusual activity: deposits with little or no play, many accounts on one device, or sudden changes in how an account is used.'] },
      { id: 'limits', title: 'Blocking and reporting', paragraphs: ['We can refuse a payment, close an account and report it to the authorities when the law requires it. We may not be allowed to tell you that a report was made.'] },
      { id: 'records', title: 'Records', paragraphs: ['We keep identity and transaction records for as long as the law requires, even after an account is closed.'] },
    ],
  },
  refund: {
    slug: 'refund',
    updatedAt: UPDATED,
    sections: [
      { id: 'general', title: 'In general', paragraphs: ['Coins are delivered at once and can be played at once. By paying, you ask us to deliver them right away. This means that coins you have played with cannot be refunded.'] },
      { id: 'unspent', title: 'Unspent deposits', paragraphs: ['If you have not played with a deposit, write to us within 14 days of the payment. We return it through the same payment method.'] },
      { id: 'errors', title: 'Mistakes and double payments', paragraphs: ['If you were charged twice, or coins did not arrive after a successful payment, we fix it or refund the payment. Send us the receipt from your bank or provider.'] },
      { id: 'results', title: 'Game results', paragraphs: ['A case, upgrade or battle that was played is final, and you can check each result yourself. A lost result is not a reason for a refund.'] },
      { id: 'chargebacks', title: 'Chargebacks', paragraphs: ['Please write to us before asking your bank to reverse a payment. A chargeback on a valid payment can close the account.'] },
      { id: 'how', title: 'How to ask', paragraphs: ['Use the Contact page, pick the Payment topic, and include the date, the amount and the payment method. Refunds go back to the original method.'] },
    ],
  },
}

export const getFaq = (): FaqResponse => FAQ

export function getLegal(slug: string): LegalDoc {
  const doc = LEGAL[slug as LegalSlug]
  if (!doc) throw new MockError(404, 'No such document')
  return doc
}

let ticket = 48211
export function sendContact(body: Partial<ContactBody>): ContactResponse {
  if (!/^\S+@\S+\.\S+$/.test(body.email ?? '') || (body.message ?? '').trim().length < 10) throw new MockError(400, 'Check your email and message')
  return { ticketId: `KD-${++ticket}` }
}
