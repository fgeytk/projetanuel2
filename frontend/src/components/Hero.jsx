import { ASSOCIATION_NAME } from '../lib/constants.js'

export default function Hero({ stats, user, onPlay, onOpenAuth }) {
  return (
    <section className="hero panel">
      <div className="hero__orbs" aria-hidden="true">
        <span />
        <span />
      </div>

      <div>
        <p className="eyebrow">Le concours de vannes 🎤</p>
        <h1>
          Sors la <span className="glow-text">réplique la plus drôle</span>, la communauté se marre… ou pas.
        </h1>
        <p className="hero__pitch">
          Ici on ne révise pas : la bonne réponse est déjà affichée, à toi de la balancer de la
          façon la plus marrante possible. Le public vote pour les meilleures vannes, et chaque
          point arraché devient un don symbolique pour {ASSOCIATION_NAME}. Le rire qui fait du bien. 😄
        </p>

        <div className="hero__cta">
          <button type="button" className="button button--primary" onClick={onPlay}>
            Balance ta vanne
          </button>
          {!user && (
            <button type="button" className="button" onClick={onOpenAuth}>
              Rejoindre la troupe
            </button>
          )}
        </div>
      </div>

      <div className="hero__impact">
        <span className="impact-counter">{stats.donationPoints ?? 0}</span>
        <strong>points de rire récoltés</strong>
        <small>
          {stats.gameCount ?? 0} sessions de vannes · {stats.questionCount ?? 0} questions
        </small>
      </div>
    </section>
  )
}
