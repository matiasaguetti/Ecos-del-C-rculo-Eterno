async function loadLibros() {
  const res = await fetch("libros-05.json");
  const data = await res.json();

  const container = document.querySelector("#libros-container");
  container.innerHTML = "";

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "libro-card";

    const title = document.createElement("h3");
    title.textContent = item.title;

    if (item.subtitle) {
      const sub = document.createElement("p");
      sub.innerHTML = `<em>${item.subtitle}</em>`;
      card.appendChild(sub);
    }

    if (item.date) {
      const date = document.createElement("small");
      date.textContent = item.date;
      card.appendChild(date);
    }

    // texto: si contiene etiquetas, lo renderizamos como HTML
    const body = document.createElement("div");
    if (/<[a-z][\s\S]*>/i.test(item.body)) {
      body.innerHTML = item.body;
    } else {
      body.textContent = item.body;
    }
    card.appendChild(body);

    if (item.images && item.images.length) {
      const img = document.createElement("img");
      img.src = item.images[0]; // primera imagen
      card.appendChild(img);
    }

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadLibros);
