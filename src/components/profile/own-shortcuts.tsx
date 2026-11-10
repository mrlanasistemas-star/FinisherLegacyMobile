import { router, type Href } from 'expo-router';
import { Headphones, Package, Shirt } from 'lucide-react-native';

import { ListGroup, ListRow } from '@/components/ui/list-row';
import { spacing } from '@/theme/tokens';

/**
 * "Mi espacio" on your own profile — the personal places people come back
 * to, as a grouped inset list. Privacy/account/security live only in
 * Configuración (gear icon) so nothing is duplicated.
 * `isPrivate` kept for API compatibility.
 */
export function OwnProfileShortcuts(_props: { isPrivate: boolean }) {
  return (
    <ListGroup style={{ marginTop: spacing.sm }}>
      <ListRow icon={Package} label="Mis pedidos" description="Estado y entregas" onPress={() => router.push('/orders')} />
      <ListRow icon={Shirt} label="Mi equipo" description="Piezas conectadas por NFC" onPress={() => router.push('/gear')} />
      <ListRow icon={Headphones} label="Entrenamientos" description="Mensajes de ánimo de tu equipo" onPress={() => router.push('/training' as Href)} />
    </ListGroup>
  );
}
