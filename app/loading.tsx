import "@/css/loading.css"
export default function Loading() {
  return (
    <div className="loading-ui">
    <div className="loader">
      {(function () {
        const arr = [];
        for (let i = 0; i < 26; i++) {
          arr.push(<div key={i} className="dot"></div>);
        }
        return arr;
      })()}
    </div>
    <h1 className="loading-txt">Sanatan AI</h1>
    </div>
  );
}
