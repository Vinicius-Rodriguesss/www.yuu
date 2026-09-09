import { useEffect, useState } from "react";

// Mesmo breakpoint usado no NavBar/index.css e no main.css (menu vira "menuMobile" abaixo disso).
// Usado só pelo Calendar pra decidir entre a grade do desktop e a lista de cards do mobile —
// os dois componentes são pesados demais pra montar os dois ao mesmo tempo, então trocamos via JS.
const MOBILE_QUERY = "(max-width: 991px)";

// Override só pra QA/preview: ?layout=mobile ou ?layout=desktop na URL força um dos layouts.
// Não é persistido — ao sair de /calendar e voltar pelo menu, volta a detectar pelo tamanho da tela.
const readOverride = (): boolean | null => {
  if (typeof window === "undefined") return null;
  try {
    const q = new URLSearchParams(window.location.search).get("layout");
    if (q === "mobile") return true;
    if (q === "desktop") return false;
  } catch {
    /* ignore */
  }
  return null;
};

const getMatch = () => {
  const override = readOverride();
  if (override !== null) return override;
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
};

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getMatch);

  useEffect(() => {
    if (readOverride() !== null) return; // override manual ativo, ignora o tamanho da tela
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
