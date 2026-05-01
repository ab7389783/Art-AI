
import React from 'react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

export const LinkifiedText: React.FC<LinkifiedTextProps> = ({ 
    text, 
    className = "",
    linkClassName = "text-blue-400 hover:text-blue-300 underline decoration-blue-500/50 hover:decoration-blue-300 transition-colors break-all"
}) => {
    // Regex matches http/https URLs.
    // It captures the URL for splitting.
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <span className={className}>
            {parts.map((part, index) => {
                // Check if the part starts with http/https to identify it as a candidate URL
                if (part.match(/^https?:\/\//)) {
                    // Identify trailing punctuation that shouldn't be part of the clickable link.
                    // Matches one or more: . , ; ! ? ) ] at the end of the string.
                    // This prevents "http://example.com." from including the dot in the href.
                    const trailingMatch = part.match(/[.,;!?\])]+$/);
                    let cleanUrl = part;
                    let suffix = '';

                    if (trailingMatch) {
                        suffix = trailingMatch[0];
                        cleanUrl = part.slice(0, -suffix.length);
                    }

                    return (
                        <React.Fragment key={index}>
                            <a 
                                href={cleanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={linkClassName}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {cleanUrl}
                            </a>
                            {suffix}
                        </React.Fragment>
                    );
                }
                // Return non-URL text as is
                return part;
            })}
        </span>
    );
};
