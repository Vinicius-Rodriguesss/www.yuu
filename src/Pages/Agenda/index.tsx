// import { useParams } from "react-router-dom";
import { useState } from "react";
import { FiChevronLeft } from "react-icons/fi";
import "./index.css";

// Essa é página onde o usuario se agenda
// ele funcionará como um chekout de pagamento

// Ele vai ser dividido em steps
// Cadastro, Serviço, Produto, Endereço, Horario e Confirmação
const stepTitles = ["Cadastro", "Serviços", "Produtos", "Endereço", "Horário", "Confirmação"];

const Agenda = () => {
  // const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState(0);

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goToStep = (index: number) => setStep(index);

  return (
    <div className="agenda-page">
      <div className="container-agenda">

        {/* Vai ter dois lados */}
        {/* Primeiro: lado, onde seleciona */}
        <div className="side side-one">
          <div className="header-side">
            {/* Icone de voltar */}
            {/* Titulo do step */}
            <button onClick={goBack} disabled={step === 0}><FiChevronLeft /></button>
            <span>{stepTitles[step]}</span>
          </div>

          <form>

          </form>

          <div className="footer-side">
            <div className="container-cicle">
              {stepTitles.map((title, index) => (
                <div
                  key={title}
                  className={`cicle ${index === step ? "cicle-active" : ""}`}
                  onClick={() => goToStep(index)}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Segundo: onde ve os dados  */}
        <div className="side side-two">

        </div>

      </div>
    </div>
  );
};

export default Agenda;
