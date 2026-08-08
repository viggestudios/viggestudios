const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".navigation");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const open = navigation.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "Luk" : "Menu";
  });

  document.querySelectorAll(".navigation a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "Menu";
    });
  });
}

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("visible"));
}

document.querySelectorAll(".video-card").forEach((card) => {
  const video = card.querySelector("video");
  const button = card.querySelector(".video-toggle");

  if (!video || !button) return;

  button.addEventListener("click", async () => {
    if (video.paused) {
      document.querySelectorAll(".video-card video").forEach((otherVideo) => {
        if (otherVideo !== video) otherVideo.pause();
      });

      document.querySelectorAll(".video-toggle").forEach((otherButton) => {
        if (otherButton !== button) otherButton.textContent = "Afspil";
      });

      try {
        await video.play();
        button.textContent = "Pause";
      } catch {
        button.textContent = "Afspil";
      }
    } else {
      video.pause();
      button.textContent = "Afspil";
    }
  });

  video.addEventListener("ended", () => {
    button.textContent = "Afspil";
  });
});

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
