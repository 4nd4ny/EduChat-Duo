import React, { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface UserMessageContentProps {
  content: string;
}

const UserMessageContent: React.FC<UserMessageContentProps> = ({ content }) => {
  // Vérifie si le message contient du code avec des triples backticks
  const hasCodeBlock = content.includes('```');

  if (hasCodeBlock) {
    // Si le message contient du code, utilisez ReactMarkdown pour le rendu
    return (
      <ReactMarkdown
        components={{
          code: ({ inline, className, children, ...props }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark as any}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  wordBreak: 'break-word' as const
                }}
                codeTagProps={{
                  style: {
                    whiteSpace: 'pre-wrap'
                  }
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code 
                className={className} 
                style={{ whiteSpace: 'pre-wrap' }}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <pre style={{ whiteSpace: 'pre-wrap' }}>{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  } else {
    // Sinon, rendu simple avec préservation des espaces
    return <div>{content}</div>;
  }
};

export default UserMessageContent;