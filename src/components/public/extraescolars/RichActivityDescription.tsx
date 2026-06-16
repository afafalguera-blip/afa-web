interface RichActivityDescriptionProps {
  text: string;
}

const HEADING_MAX_LEN = 68;

function isBullet(line: string) {
  return line.startsWith('•') || line.startsWith('- ');
}

function stripBullet(line: string) {
  return line.replace(/^[•-]\s*/, '');
}

/**
 * Renders the plain-text activity description with light structure.
 * Source text uses blank lines between sections, an optional short heading as
 * the first line of a section, and "• " for list items. No markdown parser
 * needed: the content is authored in this convention (see activities migration).
 */
export function RichActivityDescription({ text }: RichActivityDescriptionProps) {
  if (!text?.trim()) return null;

  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {blocks.map((block, bi) => {
        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const bullets = lines.filter(isBullet).map(stripBullet);
        const nonBullets = lines.filter((l) => !isBullet(l));

        // First single-line block = lead/subtitle
        if (bi === 0 && lines.length === 1) {
          return (
            <p
              key={bi}
              className="text-lg sm:text-xl font-semibold text-[#111813] dark:text-white leading-snug"
            >
              {lines[0]}
            </p>
          );
        }

        // Detect a short heading at the top of the section
        let heading: string | null = null;
        let paragraphs = nonBullets;
        if (
          nonBullets.length > 0 &&
          nonBullets[0].length <= HEADING_MAX_LEN &&
          (bullets.length > 0 || nonBullets.length > 1)
        ) {
          heading = nonBullets[0];
          paragraphs = nonBullets.slice(1);
        }

        return (
          <div key={bi} className="space-y-2">
            {heading && (
              <h4 className="text-base font-bold text-[#111813] dark:text-white tracking-tight">
                {heading}
              </h4>
            )}
            {paragraphs.map((p, pi) => (
              <p
                key={pi}
                className="text-[#4b5563] dark:text-gray-300 text-base leading-relaxed font-light"
              >
                {p}
              </p>
            ))}
            {bullets.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {bullets.map((b, li) => (
                  <li
                    key={li}
                    className="flex gap-2.5 text-[#4b5563] dark:text-gray-300 text-base leading-relaxed font-light"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
