const imagens = [
  ["./images/screen_02.jpg", "Passo: 01."],
  ["./images/screen_03.jpg", "Passo: 02."],
  ["./images/screen_03.jpg", "Passo: 02."],
  ["./images/screen_04.jpg", "Passo: 03."],
  [".//screen_04.jpg", "Passo: 03."],
  ["./images/screen_05.jpg", "Passo: 04."],
  ["./images/screen_05.jpg", "Passo: 04."],
  ["./images/screen_01.jpg", "Introdução."],
  ["./images/screen_01.jpg", "Introdução."],
  ["./images/screen_02.jpg", "Passo: 01."]
];

let index = 0;

function fadeTransition(imgElement, textElement, newSrc, newText) {
  imgElement.classList.add("fade-in");
  setTimeout(() => {
    imgElement.src = newSrc;
    textElement.innerHTML = `<span style="color: #9C27B0; font-weight: bold;">${newText}</span>`;
    imgElement.classList.remove("fade-in");
  }, 400);
}

setInterval(() => {
  const i1 = index % imagens.length;
  const i2 = (index + 1) % imagens.length;

  const img1 = document.getElementById("img1");
  const img2 = document.getElementById("img2");
  const text1 = document.getElementById("text1");
  const text2 = document.getElementById("text2");

  fadeTransition(img1, text1, imagens[i1][0], imagens[i1][1]);
  fadeTransition(img2, text2, imagens[i2][0], imagens[i2][1]);

  index = (index + 2) % imagens.length;
}, 5000);

function abrirModal(src) {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  modal.style.display = "block";
  modalImg.src = src;
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const imagens = document.querySelectorAll("img");
  imagens.forEach(img => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => abrirModal(img.src));
  });
});

function copiarEmail() {
  const email = document.getElementById("paypal-email").innerText;
  navigator.clipboard.writeText(email).then(() => {
    alert("Email copiado para a área de transferência!");
  });
}

function rolarParaDoacao() {
  const doacao = document.querySelector(".doacao-view");
  if (doacao) {
    doacao.scrollIntoView({ behavior: "smooth" });
  }
}
