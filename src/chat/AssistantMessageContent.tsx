import React from "react";
import { MdContentCopy } from "react-icons/md";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw"; 
import remarkBreaks from "remark-breaks"; 
import rangeParser from "parse-numeric-range";

import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import tsx from "react-syntax-highlighter/dist/cjs/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/cjs/languages/prism/typescript";
import scss from "react-syntax-highlighter/dist/cjs/languages/prism/scss";
import bash from "react-syntax-highlighter/dist/cjs/languages/prism/bash";
import markdown from "react-syntax-highlighter/dist/cjs/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/cjs/languages/prism/python";
import cpp from "react-syntax-highlighter/dist/cjs/languages/prism/cpp";
import json from "react-syntax-highlighter/dist/cjs/languages/prism/json";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("json", json);

const syntaxTheme = oneDark;

type Props = {
  content: string;
};

export default function AssistantMessageContent({ content, ...props }: Props) {

  // Fonction de transformation LaTeX
  const latex_transformer = (content: string): string  => {
    return content
      .replace(/\\\[/g, '$$') // Remplace \[ par $$
      .replace(/\\\]/g, '$$') // Remplace \] par $$
      .replace(/\\\(/g, '$')  // Remplace \( par $
      .replace(/\\\)/g, '$')  // Remplace \) par $
      .replace(/~~(.*?)~~/g, '<del>$1</del>') // Remplace ~~texte~~ par <del>texte</del>
      .replace(/\\begin\{equation\}/g, '$$') // Remplace \begin{equation} par $$
      .replace(/\\end\{equation\}/g, '$$');  // Remplace \end{equation} par $$
  };
  
  const transformedContent = latex_transformer(content);
  
  const MarkdownComponents: any = {
    // Custom renderer for <thinking> tag
    thinking: ({ children, ...props }: any) => {
      return (
        <>
          <h2 style={{ color: 'lightblue' }}>Thinking...</h2>
          {children}
        </>
      );
    },

    // Custom renderer for <encouragement> tag
    encouragement: ({ children, ...props }: any) => {
      return (
        <>
          <h2 style={{ color: 'lightblue' }}>Inducement...</h2>
          {children}
        </>
      );
    },

    // Amélioration du rendu des paragraphes pour éviter les sauts de ligne superflus
    p: ({ node, children }: any) => {
      // Vérifie si ce paragraphe est à l'intérieur d'un élément de liste
      const isInListItem = node?.parent?.tagName === 'li';
      
      // Si c'est dans un élément de liste, ne pas ajouter de balise <p>
      if (isInListItem) {
        return <>{children}</>;
      }
      
      return <p>{children}</p>;
    },

    // Mise en forme des listes
    ul: ({ children, className, ...props }: any) => {
      return (
        <ul className={`text-primary list-disc list-inside space-y-1 ${className || ""}`} {...props}>
          {children}
        </ul>
      );
    },

    ol: ({ children, className, ...props }: any) => {
      return (
        <ol className={`text-primary list-decimal list-inside space-y-1 ${className || ""}`} {...props}>
          {children}
        </ol>
      );
    },
    
    // Amélioration du rendu des éléments de liste pour éviter les sauts de ligne superflus
    li: ({ children, className, ...props }: any) => {
      // Modifié pour supprimer les espaces superflus entre les éléments de liste
      return (
        <li className={`text-secondary leading-normal ${className || ""}`} {...props}>
          {children}
        </li>
      );
    },

    // Formatage des éléments supplémentaires
    em: ({ node, inline, className, children, ...props }: any) => {
      return (
        <span className={className} {...props}>
          <i>{children}</i>
        </span>
      );
    },
    
    strong: ({ node, inline, className, children, ...props }: any) => {
      return (
        <span className={className} {...props}>
          <b>{children}</b>
        </span>
      );
    },

    pre: ({ node, inline, className, children, ...props }: any) => {
      return (
        <pre className={`m-0 ${className || ""}`} {...props}>
          {children}
        </pre>
      );
    },

    a: ({ href, children, ...props }: any) => {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
          {...props}
        >
          {children}
        </a>
      );
    },

    h1: ({ children, className, ...props }: any) => <h1 className="text-primary" {...props}>{children}</h1>,
    h2: ({ children, className, ...props }: any) => <h2 className="text-primary" {...props}>{children}</h2>,
    h3: ({ children, className, ...props }: any) => <h3 className="text-primary" {...props}>{children}</h3>,
    h4: ({ children, className, ...props }: any) => <h4 className="text-primary" {...props}>{children}</h4>,
    h5: ({ children, className, ...props }: any) => <h5 className="text-primary" {...props}>{children}</h5>,
    h6: ({ children, className, ...props }: any) => <h6 className="text-primary" {...props}>{children}</h6>,
    table: ({ children, className, ...props }: any) => <table className="text-primary" {...props}>{children}</table>,
    th: ({ children, className, ...props }: any) => <th className="text-primary" {...props}>{children}</th>,
    td: ({ children, className, ...props }: any) => <td className="text-primary" {...props}>{children}</td>,   

    code({ node, inline, className, ...props }: any) {
      const hasLang = /language-(\w+)/.exec(className || "");
      const hasMeta = node?.data?.meta;

      const applyHighlights: object = (applyHighlights: number) => {
        if (hasMeta) {
          const RE = /{([\d,-]+)}/;
          const metadata = node.data.meta?.replace(/\s/g, "");
          const strlineNumbers = RE?.test(metadata)
            ? RE?.exec(metadata)?.[1]
            : "0";
          const highlightLines = rangeParser(strlineNumbers || "0");
          const highlight = highlightLines;
          const data: string = highlight.includes(applyHighlights)
            ? "highlight"
            : "";
          return { data };
        } else {
          return {};
        }
      };

      return hasLang ? (
        <div className="relative group">
          <button
            onClick={() => navigator.clipboard.writeText(String(props.children))}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white bg-gray-800 rounded p-1"
            title="Copier le code"
          >
            <MdContentCopy className="w-4 h-4" />
          </button>
          <SyntaxHighlighter
            style={syntaxTheme}
            language={hasLang[1]}
            PreTag="div"
            className="overflow-hidden rounded-md"
            showLineNumbers={true}
            wrapLines={hasMeta}
            useInlineStyles={true}
            lineProps={applyHighlights}
          >
            {props.children}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...props} />
      );
    },

    mathml: ({ node } : any) => (
      <div dangerouslySetInnerHTML={{ __html: node.outerHTML }} />
    ),
  };

  return (
    <div className="markdown-content [&_ul]:mt-0.25 [&_ul]:mb-0.25 [&_ol]:mt-0.25 [&_ol]:mb-0.25 [&_li]:leading-tight [&_li_p]:inline [&_li_p]:m-0">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={MarkdownComponents}
      >
        {transformedContent}
      </ReactMarkdown> 
    </div>
  );
}