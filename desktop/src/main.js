function run() {
  const isOffline = !window.navigator.onLine;
  document.querySelector(".offline").style.display = "none";
  document.querySelector(".loader").style.display = "block";
  if(isOffline) {
    document.querySelector(".offline").style.display = "block";
    document.querySelector(".loader").style.display = "none";
    return
  }
  window.open("https://sanatan.shivam.click", "_self");
}
run();