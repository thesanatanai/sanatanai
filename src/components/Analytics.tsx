import Script from "next/script";

export default function Analytics() {
  const id = process.env.GA_ID || "G-104LTZTEH1";
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        async
        strategy="lazyOnload"
      />
      <Script
        id="sanatan_analytics"
        dangerouslySetInnerHTML={{
          __html: `
    window.dataLayer = window.dataLayer || [];
    function gtag(){
        window.dataLayer.push(arguments);
    }
    gtag('js', new Date());

    gtag('config', '${id}');`,
        }}
      />
    </>
  );
}
