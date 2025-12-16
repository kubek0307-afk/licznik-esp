async function loadData(){
  const res = await fetch("/api/data", {
    headers: { "access-code": accessCode }
  });

  if (!res.ok) {
    alert("Błąd pobierania danych");
    return;
  }

  const data = await res.json();

  showApp();

  document.getElementById("cLysy").innerText = data.lysy;
  document.getElementById("cPawel").innerText = data.pawel;

  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "";

  if (!data.history || data.history.length === 0) {
    historyDiv.innerHTML = "<i>Brak wpisów</i>";
    return;
  }

  data.history.forEach(h => {
    const div = document.createElement("div");
    div.className = "box";
    div.innerHTML = `
      <b>${h.person}</b> | ${h.date}<br>
      ${h.text || ""}
      ${h.img ? `<br><img src="${h.img}">` : ""}
      ${h.location ? `
        <br>
        <a target="_blank"
           href="https://maps.google.com?q=${h.location.lat},${h.location.lng}">
           📍 mapa
        </a>` : ""}
    `;
    historyDiv.appendChild(div);
  });
}
