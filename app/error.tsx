"use client";

import sendErr from "@/actions/errActions";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Eror({ error: err }: { error: Error }) {
  const error = {
    ...err,
    stack: err.stack,
    cause: err.cause,
  };

  const [reported, setReported] = useState(false);

  return (
    <>
      <style>
        {`*{user-select:none}body{background:radial-gradient(circle at 12% 14%,rgba(255,138,42,.2),transparent 31rem),radial-gradient(circle at 88% 12%,rgba(47,208,183,.16),transparent 28rem),linear-gradient(145deg,#090706 0,#16100b 46%,#080a0b 100%);color:#fff8ed;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;min-height:100vh}.error-shell{min-height:100vh}.error-card{width:min(560px,100%);padding:42px;text-align:center;background:rgba(15,12,10,.78);border:1px solid rgba(255,229,190,.16);box-shadow:0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(24px)}.error-logo{width:86px;height:86px;object-fit:contain;padding:14px;margin-bottom:18px;border-radius:50%;background:rgba(255,255,255,.07);filter:drop-shadow(0 0 22px rgba(255, 159, 63, .35))}.error-kicker{color:#f2c66d;font-size:.9rem;font-weight:700;text-transform:uppercase}.error-card h1{margin:8px 0 12px;font-size:clamp(2.1rem,8vw,4.3rem);line-height:1}.error-copy{color:#bdb4a6;line-height:1.7;margin:0 auto 26px;max-width:430px}.error-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.error-actions *{min-width:132px;padding:12px 18px;border-radius:14px;color:#fff8ed;text-decoration:none;border:1px solid rgba(255,228,186,.14)}.error-primary{background:linear-gradient(135deg,#ff8a2a,#f2c66d 42%,#ff5e00);color:#fff!important;box-shadow:0 16px 40px rgba(255,138,42,.22)}`}
      </style>
      <main className="error-shell p-0 md:p-7 place-items-center" aria-labelledby="error-title">
        <section className="error-card rounded-0 md:rounded-3xl center-flex flex-col">
          <Image
            className="error-logo hidden md:block"
            src="/logo.png"
            loading="eager"
            preload
            alt="Sanatan AI"
            width={86}
            height={86}
          />
          <p className="error-kicker">Some error caused.</p>
          <h1 id="error-title font-display">Error</h1>
          <p className="error-copy">
            The page you opened is not available dur to some errors. Retry, or
            Logout to Sanatan AI and begin a fresh conversation. <br />
            We are caught with an Internal Server Error, Your problem will soon
            be fixed. <br />
            If not fixed, connect with us at{" "}
            <a href="mailto:great.sanatan.ai@gmail.com">
              our email: great.sanatan.ai@gmail.com
            </a>
          </p>
          <div className="error-actions">
            <Link className="error-primary not" data-label="Logout from Sanatan AI" href="/welcome?logout=true">
              Logout
            </Link>
            <button
              className="error-primary"
              data-label="Reload this page"
              onClick={() => window?.location?.reload?.()}
            >
              Reload
            </button>
            <button
              className="error-primary"
              data-label="Report about this error!"
              onClick={() => {
                setReported(true);
                sendErr(error);
              }}
              disabled={reported}
            >
              {reported ? "Reported" : "Report"}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
