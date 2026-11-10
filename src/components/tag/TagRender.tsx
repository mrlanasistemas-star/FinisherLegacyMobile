import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { balanceLines, type TagFace } from '@/features/commerce/tag-design';
import { fontFamily, palette } from '@/theme/tokens';

import { MONOGRAM_RATIO, TAG_WIDTHS, tagGeometry, type TagGeometry, type TagSide, type TagSize } from './tag-geometry';
import { useI18n } from '@/i18n';

const MONOGRAM = require('@/assets/images/brand/fl-monograma.png');
export { TAG_WIDTHS, tagGeometry, type TagSide, type TagSize } from './tag-geometry';

interface TagRenderProps {
  face: TagFace;
  side?: TagSide;
  size?: TagSize;
  /** Explicit body width; overrides `size`. */
  width?: number;
  /** Soft drop shadow under the body (off for flat thumbnails). */
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Finisher Legacy Tag, drawn: rounded ≈1:2 body, horizontal slot near
 * the top threaded by a black silicone loop, and
 * - front: full-bleed destination art (expo-image, crossfades when the art
 *   changes) under a dark header with the official FL monogram, a thin gold
 *   rule, the name in spaced caps and the discipline line. Without art the
 *   front is black and gold;
 * - back: black with the phrase ("TU HISTORIA SIGUE VIVA") and the NFC mark.
 * No QR anywhere — the tag opens your memory by NFC.
 */
export const TagRender = memo(function TagRender({ face, side = 'front', size = 'md', width, shadow = true, style }: TagRenderProps) {
  const { t } = useI18n();
  const g = tagGeometry(width ?? TAG_WIDTHS[size]);
  const label =
    side === 'front'
      ? face.disciplineLine
        ? t('Finisher Legacy Tag {name}, {discipline}', { name: face.nameLine, discipline: face.disciplineLine })
        : t('Finisher Legacy Tag {name}', { name: face.nameLine })
      : t('Reverso del Finisher Legacy Tag: {line}. Se abre con NFC.', { line: face.backLine });

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[{ width: g.width, height: g.height }, style]}>
      <Loop g={g} />
      <View
        style={[
          { position: 'absolute', top: g.loopH, left: 0, width: g.width, height: g.bodyH, borderRadius: g.radius, borderCurve: 'continuous', backgroundColor: palette.carbon },
          shadow
            ? { shadowColor: '#1A140B', shadowOffset: { width: 0, height: 4 * g.u }, shadowOpacity: 0.28, shadowRadius: 8 * g.u, elevation: g.width > 60 ? 3 : 1 }
            : null,
        ]}>
        <View style={{ flex: 1, borderRadius: g.radius, borderCurve: 'continuous', overflow: 'hidden' }}>
          {side === 'front' ? <Front face={face} g={g} /> : <Back face={face} g={g} />}
          <Slot g={g} />
          <Finish g={g} />
        </View>
      </View>
    </View>
  );
});

type Geometry = TagGeometry;

/** Black silicone loop: an inverted U that dives into the slot (drawn behind the body). */
function Loop({ g }: { g: Geometry }) {
  const { u, strap } = g;
  const bottom = g.loopH + g.slot.top + g.slot.height / 2;
  const r = (strap.right - strap.left) / 2;
  const top = 5 * u;
  const d = `M ${strap.left} ${bottom} L ${strap.left} ${top + r} A ${r} ${r} 0 0 1 ${strap.right} ${top + r} L ${strap.right} ${bottom}`;
  return (
    <Svg width={g.width} height={bottom + 1} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id="fl-loop" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2C2C30" />
          <Stop offset="0.5" stopColor="#0B0B0C" />
          <Stop offset="1" stopColor="#26262A" />
        </SvgLinearGradient>
      </Defs>
      <Path d={d} stroke="url(#fl-loop)" strokeWidth={strap.width} strokeLinecap="round" fill="none" />
      {/* Satin highlight along the silicone. */}
      <Path d={d} stroke="rgba(255,255,255,0.10)" strokeWidth={Math.max(0.5, strap.width * 0.18)} strokeLinecap="round" fill="none" transform={`translate(${-strap.width * 0.18} 0)`} />
    </Svg>
  );
}

/** The slot cut through the body, with the strap's fold showing through it. */
function Slot({ g }: { g: Geometry }) {
  const { slot, strap, u } = g;
  const left = (g.width - slot.width) / 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: slot.top, left, width: slot.width, height: slot.height }}>
      <View
        style={{
          flex: 1,
          borderRadius: slot.height / 2,
          backgroundColor: '#030303',
          borderWidth: Math.max(0.5, 0.45 * u),
          borderColor: 'rgba(255,255,255,0.16)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: slot.height * 0.18,
          bottom: slot.height * 0.18,
          left: strap.left - strap.width / 2 - left,
          width: strap.right - strap.left + strap.width,
          borderRadius: slot.height / 2,
          backgroundColor: '#1C1C1F',
        }}
      />
    </View>
  );
}

/** Edge bevel + a soft diagonal sheen so the tag reads as a physical object. */
function Finish({ g }: { g: Geometry }) {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.05)']}
        locations={[0, 0.32, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: g.radius,
          borderCurve: 'continuous',
          borderWidth: Math.max(0.5, 0.5 * g.u),
          borderColor: 'rgba(255,255,255,0.14)',
        }}
      />
    </>
  );
}

function Monogram({ face, g, scale = 1 }: { face: TagFace; g: Geometry; scale?: number }) {
  const width = g.monogram.width * scale;
  return (
    <Image
      source={face.monogramUrl ? { uri: face.monogramUrl } : MONOGRAM}
      placeholder={MONOGRAM}
      placeholderContentFit="contain"
      style={{ width, height: width * MONOGRAM_RATIO }}
      contentFit="contain"
      cachePolicy="memory-disk"
      accessible={false}
    />
  );
}

function GoldRule({ g, width = 16 }: { g: Geometry; width?: number }) {
  return <View style={{ width: width * g.u, height: Math.max(0.6, 0.55 * g.u), backgroundColor: palette.gold, opacity: 0.9 }} />;
}

function Front({ face, g }: { face: TagFace; g: Geometry }) {
  const { u } = g;
  return (
    <>
      {face.artUrl ? (
        <Image
          source={{ uri: face.artUrl }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={280}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        <FallbackFront face={face} g={g} />
      )}
      {face.artUrl ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(11,11,12,0.92)', 'rgba(11,11,12,0.62)', 'rgba(11,11,12,0)']}
          locations={[0, 0.55, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '58%' }}
        />
      ) : null}
      <View style={{ position: 'absolute', top: 22 * u, left: 6 * u, right: 6 * u, alignItems: 'center' }}>
        <Monogram face={face} g={g} />
        <View style={{ height: 4.5 * u }} />
        <GoldRule g={g} />
        <View style={{ height: 4.5 * u }} />
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={{ fontFamily: fontFamily.headingSemibold, fontSize: 9.5 * u, letterSpacing: 2.2 * u, color: palette.bone, textAlign: 'center', includeFontPadding: false }}>
          {face.nameLine}
        </Text>
        {face.disciplineLine ? (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{ marginTop: 2.2 * u, fontFamily: fontFamily.semibold, fontSize: 4.6 * u, letterSpacing: 1.6 * u, color: palette.goldLight, textAlign: 'center', includeFontPadding: false }}>
            {face.disciplineLine}
          </Text>
        ) : null}
      </View>
    </>
  );
}

/** No art yet: black body, accent glow from below and engraved gold rings. */
function FallbackFront({ face, g }: { face: TagFace; g: Geometry }) {
  const { width, bodyH } = g;
  const cx = width / 2;
  const cy = bodyH * 0.86;
  return (
    <Svg width={width} height={bodyH} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id="fl-fb-body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#18181B" />
          <Stop offset="1" stopColor={palette.carbon} />
        </SvgLinearGradient>
        <RadialGradient id="fl-fb-glow" cx={cx} cy={cy} rx={width * 0.9} ry={bodyH * 0.45} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={face.accent} stopOpacity={0.42} />
          <Stop offset="1" stopColor={face.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={bodyH} fill="url(#fl-fb-body)" />
      <Rect x={0} y={0} width={width} height={bodyH} fill="url(#fl-fb-glow)" />
      {[0.28, 0.42, 0.56, 0.7, 0.84].map((k, i) => (
        <Circle key={k} cx={cx} cy={cy} r={width * k} stroke={palette.gold} strokeOpacity={0.22 - i * 0.03} strokeWidth={Math.max(0.5, g.u * 0.5)} fill="none" />
      ))}
    </Svg>
  );
}

function Back({ face, g }: { face: TagFace; g: Geometry }) {
  const { u, width, bodyH } = g;
  const lines = balanceLines(face.backLine);
  return (
    <>
      <Svg width={width} height={bodyH} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Defs>
          <SvgLinearGradient id="fl-back-body" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#141416" />
            <Stop offset="1" stopColor={palette.carbon} />
          </SvgLinearGradient>
          <RadialGradient id="fl-back-glow" cx={width / 2} cy={bodyH * 0.42} rx={width * 0.8} ry={bodyH * 0.32} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={face.accent} stopOpacity={0.14} />
            <Stop offset="1" stopColor={face.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={bodyH} fill="url(#fl-back-body)" />
        <Rect x={0} y={0} width={width} height={bodyH} fill="url(#fl-back-glow)" />
      </Svg>
      <View style={{ position: 'absolute', top: bodyH * 0.3, left: 8 * u, right: 8 * u, alignItems: 'center' }}>
        <Monogram face={face} g={g} scale={1.25} />
        <View style={{ height: 6 * u }} />
        <GoldRule g={g} width={14} />
        <View style={{ height: 6 * u }} />
        {lines.map((line) => (
          <Text
            key={line}
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{ fontFamily: fontFamily.semibold, fontSize: 5.6 * u, lineHeight: 8.6 * u, letterSpacing: 2 * u, color: palette.goldLight, textAlign: 'center' }}>
            {line}
          </Text>
        ))}
      </View>
      <View style={{ position: 'absolute', top: bodyH * 0.74, left: 0, right: 0, alignItems: 'center' }}>
        <NfcMark size={15 * u} />
      </View>
    </>
  );
}

/** "•)))" — the contactless mark from the deck, in Oro Legacy. */
function NfcMark({ size }: { size: number }) {
  const stroke = Math.max(0.8, size * 0.075);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.6} fill={palette.gold} />
      <Path d="M9 8.5a5 5 0 0 1 0 7" stroke={palette.gold} strokeWidth={(stroke * 24) / size} strokeLinecap="round" fill="none" />
      <Path d="M12.5 5.5a9 9 0 0 1 0 13" stroke={palette.gold} strokeWidth={(stroke * 24) / size} strokeLinecap="round" fill="none" />
      <Path d="M16 2.5a13 13 0 0 1 0 19" stroke={palette.gold} strokeWidth={(stroke * 24) / size} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
