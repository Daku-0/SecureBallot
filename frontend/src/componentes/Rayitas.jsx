/**
 * Conteo a la manera de las actas de escrutinio: cuatro rayas y una cruzada
 * por cada grupo de cinco votos.
 */
export default function Rayitas({ votos }) {
  const grupos = Math.ceil(votos / 5);
  return (
    <span className="rayitas" role="img" aria-label={`${votos} votos`}>
      {Array.from({ length: grupos }, (_, g) => {
        const n = Math.min(5, votos - g * 5);
        return (
          <svg key={g} className="grupo" width="30" height="24" viewBox="0 0 30 24" aria-hidden="true">
            {Array.from({ length: Math.min(n, 4) }, (_, i) => (
              <line key={i} x1={4 + i * 6} y1="2" x2={4 + i * 6} y2="22" />
            ))}
            {n === 5 && <line x1="1" y1="17" x2="27" y2="7" />}
          </svg>
        );
      })}
    </span>
  );
}
