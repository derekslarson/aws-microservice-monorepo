
const a = 'user-ee50abb1-49a3-4168-b5a9-058cfbe8a971'
const b = 'user-0f4172e4-80a8-430d-9a03-2506e7bced7d'

const convoPrefix = `convo-friend-`

const convoId = `${convoPrefix}${[a,b].sort().join("-")}`

console.log(convoId)

console.log(convoId.replace(convoPrefix, "").replace(a, "").replace(/^-+|-+$/, ""))