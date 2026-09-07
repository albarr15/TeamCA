export function handleScroll(targetId: string, btnId: string) {
    const btn = document.getElementById(btnId);
    btn?.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (!target) return;
        const navbarOffset = 64;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - navbarOffset;
        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
        });
    });
}