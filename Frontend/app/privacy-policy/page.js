export const metadata = {
  title: "Privacy Policy",
  description: "Learn how AI Marketing Platform collects, uses, and protects information.",
  robots: { index: true, follow: true },
};

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-slate-600">{children}</div>
  </section>
);

const ContactEmail = () => (
  <a className="font-medium text-indigo-600 underline underline-offset-4" href="mailto:support@yourdomain.com">
    support@yourdomain.com
  </a>
);

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6 lg:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-12">
        <header className="mb-10 border-b border-slate-200 pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-600">AI Marketing Platform</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-slate-500">Effective date: November 21, 2026 · Last updated: November 21, 2026</p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            This Privacy Policy explains how Xhire Tech Pvt. Ltd. collects, uses, stores, and shares information when you use AI Marketing Platform and its connected services.
          </p>
        </header>
        <div className="space-y-9">
          <Section title="1. Who we are and how to contact us">
            <p>AI Marketing Platform is operated by Xhire Tech Pvt. Ltd. References to “we”, “us”, or “our” mean Xhire Tech Pvt. Ltd.</p>
            <p>For privacy questions or requests to access, correct, or delete information, contact us at <ContactEmail />. This is the platform’s current contact address and should be updated if our support address changes.</p>
            <p>Website: <a className="font-medium text-indigo-600 underline" href="https://ai-marketing-app-sooty.vercel.app/">https://ai-marketing-app-sooty.vercel.app/</a></p>
          </Section>
          <Section title="2. Information we collect">
            <p>The information we process depends on the features you use and the permissions you grant. It may include:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Account and authentication information:</strong> name, email address, account identifiers, and information returned by an authentication provider when you choose to sign in.</li>
              <li><strong>Business information:</strong> business name, website, contact and profile details, descriptions, and preferences you submit.</li>
              <li><strong>Connected social account information:</strong> Facebook Page and Instagram professional account names and identifiers, authorized access tokens, and information available through permissions you approve.</li>
              <li><strong>Google service information:</strong> when you connect supported Google services, information those services make available under your authorization, such as Google Business Profile locations and reviews or Google Search Console properties and performance data.</li>
              <li><strong>Content and media:</strong> captions, prompts, drafts, uploaded images, generated content, scheduled posts, and publishing records that you create or submit.</li>
              <li><strong>Technical and usage information:</strong> browser and device details, IP address, timestamps, diagnostic logs, and interactions with platform features, where collected by the application or its service providers.</li>
            </ul>
          </Section>
          <Section title="3. How we use information">
            <p>We use information as needed to create and maintain accounts and business workspaces; authenticate users; connect third-party accounts at the user's direction; create, edit, schedule, and publish content when requested; provide AI-assisted marketing features; retrieve and display authorized reviews and analytics; provide SEO analysis; secure and troubleshoot the service; respond to support requests; and comply with legal obligations.</p>
          </Section>
          <Section title="4. Meta, Google, and other connected services">
            <p>If you connect Facebook, Instagram, Google, or another supported service, the platform accesses information through the authorization and permissions you grant and subject to the applicable provider's terms and policies. The information available depends on the connection type, granted permissions, and provider API.</p>
            <p>You can disconnect an integration through the platform where that functionality is available, or revoke access through the relevant provider's settings. Disconnecting an account stops future access through that connection, but does not by itself remove information already stored in the platform. You may separately request deletion as described below.</p>
            <p>Provider policies: <a className="font-medium text-indigo-600 underline" href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">Meta Privacy Policy</a> · <a className="font-medium text-indigo-600 underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.</p>
          </Section>
          <Section title="5. AI features and service providers">
            <p>Some features use third-party technology providers to process prompts and content to generate requested marketing materials or provide platform functionality. Information you submit to an AI feature may be sent to the provider that operates that feature.</p>
            <p>We may use providers for hosting, databases, authentication, file storage, AI processing, diagnostics, and integrations. Do not include passwords, payment card details, or sensitive personal information in marketing prompts unless strictly necessary and you are authorized to provide it.</p>
          </Section>
          <Section title="6. How information is shared">
            <p>We do not sell personal information. We may share information with service providers that help operate the platform, with connected providers when you authorize an integration or request an action such as publishing, and when disclosure is required by law or necessary to protect users, the platform, or our legal rights.</p>
          </Section>
          <Section title="7. Data storage and security">
            <p>We use technical and organizational measures intended to protect information against unauthorized access, alteration, disclosure, or loss. No method of electronic storage or transmission is completely secure, and we cannot guarantee absolute security.</p>
          </Section>
          <Section title="8. Data retention">
            <p>We retain information for as long as reasonably necessary to provide the platform, maintain features you use, meet legal obligations, resolve disputes, and enforce our agreements. Retention depends on the type of information and the purpose for which it was collected.</p>
          </Section>
          <Section title="9. Your choices and data deletion requests">
            <p>You may request access to, correction of, or deletion of information associated with your account, subject to applicable law. To make a request, email <ContactEmail /> from the email address associated with your account, where possible. Include “Privacy Request” or “Data Deletion Request” in the subject and identify the account or connected business concerned. We may ask for reasonable information to verify the request.</p>
            <p>We will review and respond within the time required by applicable law. Some information may need to be retained where the law requires it or where it is necessary to establish, exercise, or defend legal claims. Deleting information from our platform does not delete information held independently by Meta, Google, or another provider; you must contact those providers separately for their records.</p>
          </Section>
          <Section title="10. Cookies and similar technologies">
            <p>The platform may use cookies or similar technologies for authentication, session management, security, and essential functionality. You can manage cookies through your browser settings. Disabling certain cookies may affect platform functionality.</p>
          </Section>
          <Section title="11. International processing">
            <p>Our service providers may process or store information in countries other than the country where you live. Where required, we take steps intended to ensure that international processing is subject to appropriate protections under applicable law.</p>
          </Section>
          <Section title="12. Children's privacy">
            <p>The platform is intended for business use and is not directed to children. We do not knowingly collect personal information from children in circumstances where doing so would violate applicable law.</p>
          </Section>
          <Section title="13. Changes to this policy">
            <p>We may update this Privacy Policy as the platform, integrations, or legal requirements change. We will publish the revised policy on this page and update the “Last updated” date.</p>
          </Section>
          <Section title="14. Contact">
            <p>For questions about this Privacy Policy or requests relating to personal information, contact:</p>
            <p><strong>Xhire Tech Pvt. Ltd.</strong><br />AI Marketing Platform<br /><ContactEmail /></p>
          </Section>
        </div>
        <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-400">© {new Date().getFullYear()} Xhire Tech Pvt. Ltd. All rights reserved.</footer>
      </article>
    </main>
  );
}
