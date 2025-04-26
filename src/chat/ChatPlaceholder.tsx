import React from "react";
import Link from "next/link";
import { wrapIcon } from "../utils/Icon";
import { BsGithub as RawBsGithub } from "react-icons/bs";

type Props = {};

// Wrap GitHub icon to ensure valid ReactElement
const BsGithub = wrapIcon(RawBsGithub);
export default function ChatPlaceholder({}: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="max-w-md p-4 text-center text-primary">
        <h1 className="text-4xl font-medium">EduChat</h1>
        <p className="mt-4 text-lg">
          Claude et ChatGPT pour l'enseignement
        </p>
        <h1>&nbsp;</h1>
        <p className="text-4xl text-center hover:text-primary flex items-center justify-center gap-1">
          <Link href="https://github.com/4nd4ny/EduChat/" target="_blank">
            <BsGithub/>
          </Link>
        </p>
        <h1>&nbsp;</h1>
        <h1>&nbsp;</h1>
        <center>
          <style>
            {`
              .image-container {
                position: relative;
                width: 180px;
                height: 180px;
              }
              @keyframes morph {
                  0%, 35% { opacity: 1; }    /* Image visible */
                  35%, 50% { opacity: 0; }   /* Fondu sortant */
                  50%, 85% { opacity: 0; }   /* Image invisible */
                  85%, 100% { opacity: 1; }  /* Fondu entrant */
              }
              .image-morph {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                animation: morph 6s infinite cubic-bezier(0.4, 0, 0.2, 1);
              }
              .image-morph:nth-child(2) {
                animation-delay: -3s;
              }
            `}
          </style>
          <div className="image-container">
            <img 
              className="image-morph"
              src="https://chamblandes.education/openai.png" 
              alt="Gymnase de Chamblandes + OpenAI"
            />
            <img 
              className="image-morph"
              src="https://chamblandes.education/claude.png" 
              alt="Gymnase de Chamblandes + Anthropic"
            />
          </div>
        </center>
        <h1>&nbsp;</h1>
        <h1>&nbsp;</h1>
        <p className="text-xs text-center hover:text-primary items-center justify-center gap-1">
          Pour des problèmes complexes, <br/>cliquez sur "Regénérer en mode réflexion".
        </p>
      </div>
    </div>
  );
}
