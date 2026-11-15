import { Linking } from 'react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import { font, useTheme } from '@/theme';

/** Renderer Markdown (bold, list, tabel, kode) untuk jawaban AI & forum. */
export function Markdown({ children, color }: { children: string; color?: string }) {
  const { c } = useTheme();
  const text = color ?? c.text;
  return (
    <MarkdownDisplay
      onLinkPress={(url) => {
        if (/^https?:\/\//.test(url)) Linking.openURL(url);
        return false;
      }}
      style={{
        body: { color: text, fontFamily: font.regular, fontSize: 14, lineHeight: 21 },
        strong: { fontFamily: font.bold, fontWeight: 'normal' },
        em: { fontStyle: 'italic' },
        heading1: { fontFamily: font.extrabold, fontSize: 18, marginVertical: 6 },
        heading2: { fontFamily: font.bold, fontSize: 16, marginVertical: 6 },
        heading3: { fontFamily: font.bold, fontSize: 15, marginVertical: 4 },
        paragraph: { marginTop: 0, marginBottom: 8 },
        bullet_list: { marginBottom: 6 },
        ordered_list: { marginBottom: 6 },
        link: { color: c.primary, textDecorationLine: 'underline' },
        code_inline: { backgroundColor: c.surfaceAlt, borderRadius: 4, paddingHorizontal: 4, fontSize: 13 },
        fence: { backgroundColor: c.surfaceAlt, borderColor: c.border, borderRadius: 8, padding: 10, fontSize: 12 },
        table: { borderColor: c.border, borderWidth: 1, borderRadius: 6, marginVertical: 6 },
        th: { padding: 6, backgroundColor: c.surfaceAlt },
        td: { padding: 6, borderColor: c.border },
        tr: { borderColor: c.border },
        blockquote: { backgroundColor: c.surfaceAlt, borderLeftColor: c.primary, paddingHorizontal: 10 },
      }}
    >
      {children}
    </MarkdownDisplay>
  );
}
