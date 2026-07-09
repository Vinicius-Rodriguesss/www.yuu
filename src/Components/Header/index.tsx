import React from "react";

const style: {
  header: React.CSSProperties;
  logo: React.CSSProperties;
} = {
  header: {
    width: "100%",
    height: "70px",
    display: "flex",
    alignItems: "center",
    padding: "0 2rem",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1000,
    background: "transparent",
  },

  logo: {
    width: "50px",
    height: "50px",
    objectFit: "contain",
  },
};

export default function Header() {
  return (
    <header style={style.header}>
      <img
        src="https://yu-u.vercel.app/assets/FAICON.png"
        alt="YuU"
        style={style.logo}
      />
    </header>
  );
}