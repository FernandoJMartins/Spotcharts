import React, {useEffect, useState} from 'react'

export default function App(){
  const [me, setMe] = useState(null)

  useEffect(()=>{
    fetch('/api/auth/me/', {credentials: 'include'})
      .then(r=>{
        if (!r.ok) return null
        return r.json()
      })
      .then(data=>{
        if (data) setMe(data)
      }).catch(()=>{})
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">SpotifyCharts (dev)</h1>
      {me ? (
        <div>
          <p>Signed in as {me.display_name || me.email || me.spotify_id}</p>
          <button onClick={()=>fetch('/api/auth/logout/', {method: 'POST', credentials: 'include'})}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={()=>{ window.location.href = '/api/auth/login/' }}>Sign in with Spotify</button>
        </div>
      )}
    </div>
  )
}
