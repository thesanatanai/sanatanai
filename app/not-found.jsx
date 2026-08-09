import Image from "next/image";
import Link from "next/link";

export default function notFound() {
  return (
    <>
      <style>
        {`*{user-select:none}body{background:radial-gradient(circle at 12% 14%,rgba(255,138,42,.2),transparent 31rem),radial-gradient(circle at 88% 12%,rgba(47,208,183,.16),transparent 28rem),linear-gradient(145deg,#090706 0,#16100b 46%,#080a0b 100%);color:#fff8ed;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;min-height:100vh;overflow:hidden}.not-found-shell{min-height:100vh;place-items:center;padding:28px}.not-found-card{width:min(560px,100%);padding:42px;text-align:center;border-radius:24px;background:rgba(15,12,10,.78);border:1px solid rgba(255,229,190,.16);box-shadow:0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(24px)}.not-found-logo{width:86px;height:86px;object-fit:contain;padding:14px;margin-bottom:18px;border-radius:50%;background:rgba(255,255,255,.07);filter:drop-shadow(0 0 22px rgba(255, 159, 63, .35))}.not-found-kicker{color:#f2c66d;font-size:.9rem;font-weight:700;text-transform:uppercase}.not-found-card h1{margin:8px 0 12px;font-size:clamp(2.1rem,8vw,4.3rem);line-height:1}.not-found-copy{color:#bdb4a6;line-height:1.7;margin:0 auto 26px;max-width:430px}.not-found-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.not-found-actions a{min-width:132px;padding:12px 18px;border-radius:14px;color:#fff8ed;text-decoration:none;border:1px solid rgba(255,228,186,.14)}.not-found-primary{background:linear-gradient(135deg,#ff8a2a,#f2c66d 42%,#ff5e00);color:#fff!important;box-shadow:0 16px 40px rgba(255,138,42,.22)}`}
      </style>
      <main className="not-found-shell" aria-labelledby="not-found-title">
        <section className="not-found-card">
          <Image
            className="not-found-logo"
            src="/logo.png"
            loading="eager"
            preload
            alt="Sanatan AI"
            width={86}
            height={86}
          />
          <p className="not-found-kicker">This path is quiet.</p>
          <h1 id="not-found-title">404</h1>
          <p className="not-found-copy">
            The page you opened is not available. Return to Sanatan AI and begin
            a fresh conversation.
          </p>
          <div className="not-found-actions">
            <Link className="not-found-primary" href="/">
              Return Home
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
