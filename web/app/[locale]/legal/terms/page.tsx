import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

function isZh(locale: string) {
  return locale.toLowerCase().startsWith("zh");
}

const EFFECTIVE_DATE = "2026-03-31";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (isZh(locale)) {
    return {
      title: "用户协议 | Token Arena",
      description: "Token Arena 用户协议（详细版）。",
    };
  }

  return {
    title: "Terms of Service | Token Arena",
    description: "Token Arena Terms of Service (Detailed Draft).",
  };
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  const zh = isZh(locale);

  const zhContent = (
    <>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">1. 协议的范围与生效</h2>
        <p>
          本《用户协议》（下称“协议”）适用于你访问、浏览或使用 Token
          Arena（下称“本服务”）的网站、API、以及 CLI 同步与数据展示功能
          的全部行为。
        </p>
        <p>
          本协议生效日期为 <b>{EFFECTIVE_DATE}</b>。如果你不同意本协议
          的任何条款，请停止使用本服务。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">2. 账户、资格与安全</h2>
        <p>2.1 资格：你应具备完全民事行为能力，或已获得法定监护人的同意。</p>
        <p>2.2 账户：你需要提供真实、准确、完整的注册信息，并保持更新。</p>
        <p>
          2.3 API Key：CLI 与服务端通信通过“API Key/密钥”完成鉴权。
          你应妥善保管你的密钥，避免泄露、转让或被未授权使用。
        </p>
        <p>
          2.4 风险：由于你未妥善保管密钥或泄露等原因导致的损失由你自行承担；
          如发现异常，请尽快在设置中停用/删除相关密钥，并通知我们。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">3. 服务内容与使用方式</h2>
        <p>
          本服务提供 AI
          用量统计、可视化分析、社交展示（如关注、公开主页与排行榜）
          以及数据同步功能。具体功能以你所使用的版本与页面展示为准。
        </p>
        <p>
          你理解并同意：本服务的统计数据主要来自你本地 CLI 的上传与计算，
          可能存在延迟、偏差或缺失，且不保证达到特定准确度或用途。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">4. 可接受使用（禁止事项）</h2>
        <p>你承诺不从事下列行为（包括但不限于）：</p>
        <p>4.1 违反法律法规或侵犯他人合法权益的行为；</p>
        <p>4.2 未经授权访问、探测、破坏或干扰本服务的行为；</p>
        <p>4.3 通过自动化方式批量请求、爬取或滥用接口导致不合理负载；</p>
        <p>4.4 上传或发布违法、侵权、恶意或不当内容；</p>
        <p>4.5 通过操纵、欺骗或异常数据上传影响排行榜/统计结果的行为。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">5. 用户数据与授权</h2>
        <p>
          你在本服务中上传、提交或生成的数据（包括使用统计与公开资料等），由你依法享有相应权利。
        </p>
        <p>
          为提供服务并维持功能运作，你授予我们一项全球范围的、非排他、可撤销（法律/技术可行范围内）的许可，
          使我们可为实现服务目的对你的数据进行收集、存储、处理、分析与展示。
        </p>
        <p>
          其中：当你启用公开主页或参与社交与排行榜展示时，你的部分信息将对其他用户可见，
          并可能被第三方通过公开页面浏览与索引。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">6. 第三方服务与链接</h2>
        <p>
          本服务可能集成第三方登录/认证（如 OAuth2/社交登录）及基础设施服务。
          第三方服务的条款与隐私政策可能同样适用，你应自行了解并承担相应风险。
        </p>
        <p>
          对第三方服务导致的延迟、错误或不可用，本服务在法律允许范围内不承担责任。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">7. 费用与计费（如适用）</h2>
        <p>
          目前本协议草案不涵盖付费订阅条款。若未来引入付费功能，我们将以公告或页面说明形式在生效前披露价格、计费规则与退款政策。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">8. 知识产权</h2>
        <p>
          本服务相关的软件（包括开源代码）以开源方式提供，采用 MIT 开源协议。
          除开源代码的许可范围外，本服务的界面、标识、以及相关文档等内容仍受知识产权保护。
          未经我们或权利人书面许可，你不得复制、传播、改编或以商业方式使用。
          开源代码的 MIT 许可全文可在仓库中的 `LICENSE` 文件中查阅。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">9. 免责声明</h2>
        <p>
          9.1
          按“现状”和“可用”提供：在法律允许的最大范围内，本服务不提供任何明示或暗示的担保，
          包括但不限于适销性、特定用途适用性、准确性或不侵权。
        </p>
        <p>
          9.2
          不保证：我们不保证本服务在任何时间持续可用、不间断或无错误，也不对统计结果的完整性、准确性或及时性作出保证。
        </p>
        <p>
          9.3
          外部依赖：本服务可能依赖第三方登录平台、网络与服务器基础设施等外部系统。
          因这些外部因素导致的问题，本服务在法律允许范围内不承担责任。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">10. 责任限制</h2>
        <p>
          在法律允许的最大范围内，对于因使用或无法使用本服务导致的任何间接损失、附带损失、后果性损失或惩罚性损失，
          我们不承担责任。
        </p>
        <p>
          我们对直接损失的责任上限（如适用）以你在争议发生前一定期间内支付的费用为准（如你的实际支付为零，则以零为上限）。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">11. 赔偿（Indemnity）</h2>
        <p>
          若你违反本协议或侵害任何第三方权利而导致我们或第三方承担责任、产生损失或支出费用，
          你同意向我们承担相应的赔偿责任，包括合理律师费与调查/应对成本。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">12. 中止与终止</h2>
        <p>
          若你违反本协议或存在安全风险，我们可能在通知或不通知的情况下暂停你的账户或限制使用功能；
          涉及重大或持续违规的，我们可终止对你提供服务。
        </p>
        <p>终止不影响本协议中已产生的权利义务与保留条款。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">13. 联系我们</h2>
        <p>
          若你对本协议有任何疑问或请求，请通过{" "}
          <Link href="https://github.com/poco-ai/tokenarena">
            GitHub repository
          </Link>{" "}
          与我们取得联系。
        </p>
      </section>
    </>
  );

  const enContent = (
    <>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">1. Scope and Effective Date</h2>
        <p>
          This Terms of Service (the “Terms”) applies to your access to and use
          of Token Arena (the “Service”), including the website, APIs, and CLI
          synchronization and data display features.
        </p>
        <p>
          Effective date: <b>{EFFECTIVE_DATE}</b>. If you do not agree with any
          part of these Terms, you must stop using the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">
          2. Accounts, Eligibility, and Security
        </h2>
        <p>
          2.1 Eligibility: You must have the legal authority to enter into these
          Terms, or have obtained permission from a legal guardian where
          required.
        </p>
        <p>
          2.2 Account: You agree to provide accurate registration information
          and keep it updated.
        </p>
        <p>
          2.3 API Keys: CLI-to-server communication is authenticated using API
          keys/credentials. You are responsible for safeguarding your API keys
          and preventing unauthorized use.
        </p>
        <p>
          2.4 Risk: Losses arising from your failure to protect your keys may be
          your responsibility to the extent permitted by law. If you suspect
          compromise, disable/delete affected keys and notify us promptly.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">3. Service Description</h2>
        <p>
          The Service provides AI usage analytics, dashboards, and optional
          social visibility features such as following and public profiles/
          leaderboards.
        </p>
        <p>
          You understand that usage statistics come from your local CLI uploads
          and subsequent processing. We do not guarantee completeness,
          precision, or suitability for any particular purpose.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <p>4.1 violate any applicable laws or infringe others’ rights;</p>
        <p>
          4.2 access, probe, disrupt, or interfere with the Service without
          authorization;
        </p>
        <p>4.3 abuse APIs or cause unreasonable load through automation;</p>
        <p>
          4.4 upload or share unlawful, infringing, malicious, or inappropriate
          content;
        </p>
        <p>
          4.5 manipulate rankings or analytics through deceptive or abnormal
          uploads.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">5. Data, Content, and License</h2>
        <p>
          You retain rights in your data submitted to the Service (including
          usage information and optional public profile content).
        </p>
        <p>
          To provide and operate the Service, you grant us a non-exclusive,
          worldwide, revocable (where legally/technically feasible) license to
          collect, store, process, analyze, and display your data as necessary
          to deliver the Service.
        </p>
        <p>
          When you enable public profile/leaderboard visibility, certain
          information may be visible to other users and accessible to the public
          via your profile pages.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">6. Third-Party Services</h2>
        <p>
          The Service may integrate third-party authentication and
          infrastructure. Third-party terms and privacy policies may apply in
          addition to these Terms. You are responsible for reviewing them.
        </p>
        <p>
          We are not responsible for delays, errors, or unavailability caused by
          third-party services.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">7. Fees (If Applicable)</h2>
        <p>
          This draft does not include paid subscription terms. If paid features
          are introduced, we will disclose pricing, billing rules, and refund
          policies before they take effect.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">8. Intellectual Property</h2>
        <p>
          The Service’s related software (including its open-source code) is
          provided under the MIT Open Source License. Except for the rights
          granted by that open-source license, the Service UI, branding,
          documentation, and related materials remain protected by intellectual
          property laws. No unauthorized copying, distribution, adaptation, or
          commercial exploitation is permitted. The full text of the MIT License
          for the open-source code can be found in the repository’s `LICENSE`
          file.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">9. Disclaimer</h2>
        <p>
          The Service is provided “as is” and “as available.” To the maximum
          extent permitted by law, we disclaim all warranties, whether express
          or implied, including implied warranties of merchantability, fitness
          for a particular purpose, accuracy, or non-infringement.
        </p>
        <p>
          We do not warrant uninterrupted access, error-free operation, or the
          accuracy, completeness, or timeliness of analytics.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for
          indirect, incidental, consequential, or punitive damages arising from
          your use of or inability to use the Service.
        </p>
        <p>
          Our total liability for direct damages (if any) is limited to amounts
          you paid to us before the dispute arises (and may be zero if you have
          not paid fees).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">11. Indemnity</h2>
        <p>
          You agree to indemnify us for claims, losses, damages, and expenses
          arising from your breach of these Terms or infringement of any
          third-party rights. This includes reasonable attorneys’ fees and
          costs.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">12. Suspension and Termination</h2>
        <p>
          We may suspend or terminate your access where we reasonably believe
          there is a breach of these Terms or a security risk. Such actions may
          be taken with or without prior notice in urgent situations.
        </p>
        <p>
          Termination does not affect rights and obligations that have already
          accrued under these Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">13. Contact</h2>
        <p>
          Legal inquiries: via{" "}
          <Link href="https://github.com/poco-ai/tokenarena">
            GitHub repository
          </Link>
          .
        </p>
      </section>
    </>
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {zh ? "用户协议" : "Terms of Service"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {zh ? "生效日期：" : "Effective Date: "}
        {EFFECTIVE_DATE}
      </p>

      {zh ? zhContent : enContent}

      <p className="pt-4 text-sm">
        <Link href="/register" className="underline underline-offset-4">
          {zh ? "返回注册" : "Back to Register"}
        </Link>
      </p>
    </main>
  );
}
