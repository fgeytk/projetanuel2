import { useState } from 'react'
import { APP_NAME } from '../lib/constants.js'

function buildShareText({ playerName, score, successRate, category }) {
  return `🎮 ${playerName} vient de marquer ${score} points sur ${APP_NAME} (${successRate}% de réussite, catégorie ${category}) ! À toi de défendre tes réponses.`
}

// Draws the result as a 1200x630 PNG using a plain canvas (no dependency).
function drawCard({ playerName, score, successRate, category, donationPoints }) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, 1200, 630)
  bg.addColorStop(0, '#0d0b1a')
  bg.addColorStop(1, '#1c1838')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1200, 630)

  // glow blobs
  const blob = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 1200, 630)
  }
  blob(1000, 80, 360, 'rgba(255,60,172,0.45)')
  blob(120, 560, 360, 'rgba(45,226,255,0.4)')

  ctx.textBaseline = 'top'
  ctx.fillStyle = '#2de2ff'
  ctx.font = '700 28px Inter, sans-serif'
  ctx.fillText(`${APP_NAME.toUpperCase()} · LE QUIZ ARGUMENTÉ`, 80, 80)

  ctx.fillStyle = '#f2f0ff'
  ctx.font = '700 64px "Chakra Petch", sans-serif'
  ctx.fillText(playerName, 80, 140)

  const scoreGrad = ctx.createLinearGradient(80, 0, 600, 0)
  scoreGrad.addColorStop(0, '#2de2ff')
  scoreGrad.addColorStop(1, '#ff3cac')
  ctx.fillStyle = scoreGrad
  ctx.font = '700 180px "Chakra Petch", sans-serif'
  ctx.fillText(`${score}`, 76, 250)
  ctx.fillStyle = '#b8b2d8'
  ctx.font = '600 40px Inter, sans-serif'
  ctx.fillText('points', 80, 470)

  ctx.fillStyle = '#f2f0ff'
  ctx.font = '600 34px Inter, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`${successRate}% de réussite`, 1120, 300)
  ctx.fillText(`Catégorie : ${category}`, 1120, 350)
  ctx.fillStyle = '#b8ff3c'
  ctx.fillText(`${donationPoints} points solidaires 💖`, 1120, 400)
  ctx.textAlign = 'left'

  return canvas
}

export default function ShareCard({ result }) {
  const [message, setMessage] = useState('')
  const shareText = buildShareText(result)

  async function handleShare() {
    setMessage('')
    try {
      if (navigator.share) {
        await navigator.share({ title: APP_NAME, text: shareText, url: window.location.href })
        return
      }
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`)
      setMessage('Résumé copié dans le presse-papier !')
    } catch {
      setMessage('Partage annulé.')
    }
  }

  function handleDownload() {
    setMessage('')
    try {
      const canvas = drawCard(result)
      const link = document.createElement('a')
      link.download = `quiz-arena-${result.playerName}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      setMessage("Téléchargement impossible sur ce navigateur.")
    }
  }

  return (
    <div className="share-card">
      <p className="eyebrow">Partage ton score</p>
      <span className="share-card__score">{result.score} pts</span>
      <p className="result-copy">
        {result.playerName} · {result.successRate}% de réussite · {result.category}
      </p>
      <div className="share-actions">
        <button type="button" className="button button--primary" onClick={handleShare}>
          🔗 Partager
        </button>
        <button type="button" className="button" onClick={handleDownload}>
          ⬇ Télécharger l'image
        </button>
      </div>
      {message && <p className="form-message">{message}</p>}
    </div>
  )
}
