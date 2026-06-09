import { ASSOCIATION_NAME } from '../lib/constants.js'

export default function Hero({ stats, user, onPlay, onOpenAuth }) {
  return (
    <section className="hero panel">
      <div className="hero__orbs" aria-hidden="true">
        <span />
        <span />
      </div>

      <div>
        <p className="eyebrow">Le quiz argumenté</p>
        <h1>
          Défends une réponse, <span className="glow-text">explique-la</span>, la communauté tranche.
        </h1>
        <p className="hero__pitch">
          Ici on ne coche pas une case : la bonne réponse est affichée, à toi de prouver que tu la
          comprends. Les joueurs votent pour valider tes points, et chaque point gagné devient un
          don symbolique pour {ASSOCIATION_NAME}.
        </p>

        <div className="hero__cta">
          <button type="button" className="button button--primary" onClick={onPlay}>
            ▶ Jouer maintenant
          </button>
          {!user && (
            <button type="button" className="button" onClick={onOpenAuth}>
              Créer un compte
            </button>
          )}
        </div>
      </div>

      <div className="hero__impact">
        <span className="impact-counter">{stats.donationPoints ?? 0}</span>
        <strong>points solidaires récoltés</strong>
        <small>
          {stats.gameCount ?? 0} parties jouées · {stats.questionCount ?? 0} questions
        </small>
      </div>
    </section>
  )
}
