/**
 * Buffer (buffer.com) publie sur Instagram a notre place, a l'heure dite :
 * ni compte Facebook, ni app developpeur Meta. On lui confie chaque
 * publication (texte + image a une adresse publique) par son API GraphQL.
 * La cle vient des secrets de GitHub (BUFFER_API_KEY), jamais du projet.
 * Doc : https://developers.buffer.com
 */

const API = 'https://api.buffer.com';

export class ErreurBuffer extends Error {}

async function requete<T = any>(cle: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
    body: JSON.stringify({ query, variables }),
  });
  const j = (await r.json().catch(() => ({}))) as any;
  if (r.status === 401 || j.errors?.some((e: any) => e.extensions?.code === 'UNAUTHORIZED')) {
    throw new ErreurBuffer('Buffer refuse la clé : elle a expiré ou a été régénérée. Crée une nouvelle clé et remplace le secret BUFFER_API_KEY.');
  }
  if (r.status === 429) throw new ErreurBuffer(`Buffer : trop de requêtes, réessai dans ${r.headers.get('Retry-After') ?? '?'} s.`);
  if (!r.ok || j.errors) throw new ErreurBuffer(`Buffer : ${j.errors?.map((e: any) => e.message).join(' ; ') ?? r.statusText}`);
  return j.data as T;
}

/** Le canal Instagram relie a Buffer : { id, nom }. */
export async function canalInstagram(cle: string): Promise<{ id: string; nom: string }> {
  const { account } = await requete(cle, 'query { account { organizations { id name } } }');
  for (const org of account.organizations ?? []) {
    const { channels } = await requete(
      cle,
      `query Canaux($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) { id name service isDisconnected isLocked }
      }`,
      { organizationId: org.id },
    );
    const ig = channels.find((c: any) => c.service === 'instagram' && !c.isLocked);
    if (ig) {
      if (ig.isDisconnected) throw new ErreurBuffer('Le compte Instagram est déconnecté de Buffer : reconnecte-le dans Buffer ▸ Channels.');
      return { id: ig.id, nom: ig.name };
    }
  }
  throw new ErreurBuffer('Aucun compte Instagram relié à Buffer : Buffer ▸ Channels ▸ Connect Channel ▸ Instagram.');
}

/**
 * Confie une publication a Buffer, pour l'instant `quand`.
 * Renvoie l'identifiant Buffer et le mode : « automatic » (Buffer publie
 * seul) ou « notification » (Buffer envoie un rappel sur le telephone).
 */
export async function programmer(
  cle: string,
  canal: string,
  o: { texte: string; image: string; description: string; quand: Date },
): Promise<{ id: string; mode: string; quand: string }> {
  const data = await requete(
    cle,
    `mutation Publier($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess { post { id status dueAt schedulingType } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        channelId: canal,
        text: o.texte,
        schedulingType: 'automatic',
        mode: 'customScheduled',
        dueAt: o.quand.toISOString(),
        assets: [{ image: { url: o.image, metadata: { altText: o.description.slice(0, 1000) } } }],
        metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
      },
    },
  );
  const r = data.createPost;
  if (r.__typename !== 'PostActionSuccess') throw new ErreurBuffer(`Buffer refuse la publication : ${r.message ?? r.__typename}`);
  return { id: r.post.id, mode: r.post.schedulingType, quand: r.post.dueAt };
}

/** Ou en est une publication : programmee, envoyee (avec son lien), ou en erreur. */
export async function statut(cle: string, id: string): Promise<{ statut: string; lien: string; erreur: string; mode: string }> {
  const { post } = await requete(
    cle,
    `query Statut($id: PostId!) {
      post(input: { id: $id }) { id status sentAt externalLink schedulingType error { message } }
    }`,
    { id },
  );
  return { statut: post.status, lien: post.externalLink ?? '', erreur: post.error?.message ?? '', mode: post.schedulingType };
}
