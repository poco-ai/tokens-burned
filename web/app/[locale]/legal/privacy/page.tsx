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
      title: "隐私协议 | Token Arena",
      description: "Token Arena 隐私协议（详细版）。",
    };
  }

  return {
    title: "Privacy Policy | Token Arena",
    description: "Token Arena Privacy Policy (Detailed Draft).",
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  const zh = isZh(locale);

  const zhContent = (
    <>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">1. 我们是谁</h2>
        <p>
          Token Arena（“我们”）运营本服务。我们提供 AI
          使用数据采集、分析与展示，以及（在你启用时）
          公开主页、关注关系与排行榜等社交功能。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">2. 本政策的适用范围</h2>
        <p>
          本隐私协议适用于你访问或使用 Token Arena 的网站、API 与
          CLI，同样适用于你通过第三方登录完成的身份验证。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">3. 生效日期</h2>
        <p>
          本政策生效日期为 <b>{EFFECTIVE_DATE}</b>
          。我们会根据实际处理情况不时更新本政策。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">4. 我们收集的信息（数据类别）</h2>
        <p>
          4.1
          账号与身份信息：用户名、展示名称、邮箱、头像、以及与第三方登录相关的账户标识。
        </p>
        <p>
          4.2 认证与安全信息：会话标识、登录时间、IP
          地址、用户代理（User-Agent）、会话 token 等。
        </p>
        <p>
          4.3
          设备与使用信息：设备标识（deviceId）、主机名（hostname）、会话起止时间、活跃时长、消息数、输入/输出/推理/缓存命中等
          token
          统计、模型与工具分布、项目标识（可能为哈希或原始值，取决于你的项目模式设置）。
        </p>
        <p>
          4.4
          社交与公开资料：个人简介（bio）、公开资料开关、关注与被关注关系，以及你在公开页面与排行榜中展示的统计聚合数据。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">5. 我们如何使用信息（处理目的）</h2>
        <p>我们会出于以下目的处理信息：</p>
        <p>5.1 提供账号注册、登录与安全保护（包括会话管理与防滥用）；</p>
        <p>
          5.2 计算、存储与展示你的使用统计（usage
          analytics）与成本估算（如适用）；
        </p>
        <p>5.3 支持 CLI 与服务端同步（上传与聚合）；</p>
        <p>5.4 支持社交功能（关注、互相关注、公开主页与排行榜展示）；</p>
        <p>5.5 故障排查、性能优化、以及改进产品体验；</p>
        <p>5.6 履行法律义务与应对投诉/争议。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">6. 法律依据</h2>
        <p>
          我们处理个人信息的法律依据包括（视具体场景）：
          （1）履行合同所必需；（2）为我们的合法利益（例如安全防护、反滥用、产品维护与改进）；（3）在法律要求时获得你的同意；（4）履行法定义务。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">7. 共享、委托处理与接收方</h2>
        <p>7.1 我们不向第三方出售你的个人信息。</p>
        <p>
          7.2 我们可能与以下类别的第三方共享必要信息，用于支持服务运行：
          云托管/基础设施服务商、认证/登录服务商、日志与运维服务商、以及其他为提供服务所必需的技术支持方。
        </p>
        <p>
          7.3
          排行榜为默认公开展示功能。你的部分统计信息可能对其他用户可见，并可能被公众访问与检索。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">8. 跨境传输</h2>
        <p>
          你的数据可能会在不同国家/地区被访问或处理。若涉及跨境传输，我们将采取合理的安全措施，
          并在适用法律要求下提供必要的告知与保障机制（例如合同保障、最小化共享与访问控制等）。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">9. 数据保留</h2>
        <p>
          我们仅在实现处理目的所需期间保留数据，或在法律要求的期限内保留。
          当你删除账户或请求删除时，我们将尽商业合理的方式执行删除或匿名化（但可能存在出于合规、安全或审计目的的保留例外）。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">10. 数据安全</h2>
        <p>
          我们采取合理的安全技术与管理措施，包括传输加密、访问控制、鉴权与密钥管理等。
          但任何系统都不存在完全的安全保证，你需自行对账户与密钥采取保护措施。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">11. 你的权利（数据主体权利）</h2>
        <p>
          根据你所在地的法律，你可能享有：访问、更正、删除、限制处理、反对处理、数据可携带（如适用）、以及在适用时撤回同意。
          也可能享有向监管机构投诉的权利。
        </p>
        <p>
          你可以通过{" "}
          <Link href="https://github.com/poco-ai/tokenarena">
            GitHub repository
          </Link>{" "}
          与我们取得联系。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">12. Cookie 与类似技术</h2>
        <p>
          我们使用 Cookie/会话技术以提供登录与安全保护。非必要的分析/营销
          Cookie（如有）将按适用法律征得你的同意。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">13. 自动化决策与画像（如适用）</h2>
        <p>
          我们主要使用统计与聚合数据来提供分析与展示。我们不会（或尽量避免）对你作出仅基于自动化处理且会产生法律或重大类似影响的决策。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">14. 未成年人</h2>
        <p>
          本服务不面向未达到当地法定年龄的用户。若我们发现收集了未成年人信息，我们将采取合理措施尽快删除相关信息。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">15. 本政策的更新</h2>
        <p>我们可能更新本政策。重大变更将通过站内公告或其他合规方式通知你。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">16. 联系我们</h2>
        <p>
          隐私相关联系渠道：请通过{" "}
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
        <h2 className="text-xl font-medium">1. Who We Are</h2>
        <p>
          Token Arena (“we”, “us”) operates this Service. We provide AI usage
          data collection, analytics, and presentation, and (when you enable it)
          social features such as public profiles, following, and leaderboards.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">2. Scope</h2>
        <p>
          This Privacy Policy applies to your access to or use of Token Arena’s
          website, APIs, and CLI features, including identity verification
          through third-party sign-in providers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">3. Effective Date</h2>
        <p>
          This policy is effective as of <b>{EFFECTIVE_DATE}</b>. We may update
          it from time to time to reflect actual data practices.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">4. Information We Collect</h2>
        <p>
          4.1 Account & identity data: username, display name, email, avatar,
          and third-party account identifiers.
        </p>
        <p>
          4.2 Authentication & security data: session identifiers, login
          timestamps, IP address, user agent, session tokens, and related
          metadata.
        </p>
        <p>
          4.3 Device & usage data: device ID, hostname, session start/end times,
          active duration, message counts, token statistics
          (input/output/reasoning/cache), and model/tool usage distributions.
          Project identifiers may be hashed or raw depending on your project
          mode settings.
        </p>
        <p>
          4.4 Social/public profile data (if enabled): bio, public profile
          visibility, follow relationships, and aggregated stats shown on your
          public pages and leaderboards.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">5. How We Use Data</h2>
        <p>We use personal data for:</p>
        <p>
          5.1 providing authentication, account services, and security controls;
        </p>
        <p>
          5.2 computing, storing, and displaying usage analytics and (where
          applicable) cost estimates;
        </p>
        <p>5.3 enabling CLI-to-server synchronization;</p>
        <p>
          5.4 operating social features such as following and public visibility;
        </p>
        <p>
          5.5 troubleshooting, performance optimization, and improving user
          experience;
        </p>
        <p>
          5.6 complying with legal obligations and handling complaints/disputes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">6. Legal Bases</h2>
        <p>
          We process personal data based on: (1) necessity to perform a
          contract; (2) legitimate interests (e.g., security, anti-abuse,
          product maintenance and improvement); (3) your consent where required;
          and (4) legal obligations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">7. Sharing & Recipients</h2>
        <p>7.1 We do not sell personal data.</p>
        <p>
          7.2 We may share limited, necessary data with categories of vendors
          needed to run the Service, such as cloud hosting/infrastructure
          providers, authentication providers, and operational/support vendors.
        </p>
        <p>
          7.3 When you enable public profiles or leaderboards, some information
          may be visible to other users and accessible to the public.
          Leaderboards are public by default.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">8. International Transfers</h2>
        <p>
          Your data may be accessed or processed in countries outside your
          jurisdiction. If cross-border transfers occur, we apply reasonable
          safeguards and, where required, provide appropriate notice and
          contractual or other legal mechanisms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">9. Retention</h2>
        <p>
          We retain data only as long as necessary for the purposes described or
          as required by applicable law. If you request deletion (e.g., account
          deletion), we will delete or anonymize data where commercially
          reasonable, subject to lawful exceptions for compliance, security, or
          audit purposes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">10. Security</h2>
        <p>
          We implement reasonable technical and organizational measures, such as
          encryption in transit, access control, authentication, and key
          management. However, no system can guarantee absolute security, and
          you must protect your account and credentials.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">11. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights including access,
          correction, deletion, restriction of processing, objection, data
          portability (where applicable), and withdrawal of consent where
          applicable. You may also have the right to lodge a complaint with a
          supervisory authority.
        </p>
        <p>
          To exercise your rights, contact us via{" "}
          <Link href="https://github.com/poco-ai/tokenarena">
            GitHub repository
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">12. Cookies</h2>
        <p>
          We use cookies/session technologies to enable authentication and
          security controls. Non-essential cookies (if any) are used only as
          permitted by applicable law and consent requirements.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">
          13. Automated Decision-Making & Profiling
        </h2>
        <p>
          We primarily use aggregated statistics to deliver analytics and
          display. We do not intend to make decisions that significantly affect
          you solely based on automated processing, where such effects would be
          subject to additional legal requirements.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">14. Children</h2>
        <p>
          The Service is not intended for users below the age of eligibility
          under applicable law. If we learn that we collected personal data from
          children without authorization, we will take reasonable steps to
          delete it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">15. Updates</h2>
        <p>
          We may update this policy. Material changes will be notified via
          in-app notices or other legally compliant methods.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">16. Contact</h2>
        <p>
          Privacy contact: via{" "}
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
        {zh ? "隐私协议" : "Privacy Policy"}
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
