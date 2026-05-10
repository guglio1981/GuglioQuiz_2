import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported')
    return null
  }

  try {
    // Force update of service worker to ensure latest version
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    
    // Force immediate update check
    await registration.update()
    
    return registration
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return null
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  return await Notification.requestPermission()
}

export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key not configured')
    return null
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })
    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return null
  }
}

export async function savePushSubscription(subscription: PushSubscription): Promise<boolean> {
  // Get user from localStorage
  const storedUser = localStorage.getItem('guglioquiz_user')
  if (!storedUser) {
    console.error('User not authenticated')
    return false
  }

  let userId: string
  try {
    const userData = JSON.parse(storedUser)
    userId = userData.id
  } catch {
    console.error('Invalid user data')
    return false
  }

  const subscriptionJSON = subscription.toJSON()
  
  // Delete ALL existing subscriptions for this user (only one device at a time)
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)

  // Then insert new subscription for this device only
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscriptionJSON.keys?.p256dh || '',
      auth: subscriptionJSON.keys?.auth || ''
    })

  if (error) {
    console.error('Failed to save subscription:', error)
    return false
  }

  return true
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const storedUser = localStorage.getItem('guglioquiz_user')
  if (!storedUser) return false

  let userId: string
  try {
    const userData = JSON.parse(storedUser)
    userId = userData.id
  } catch {
    return false
  }

  // Remove from database
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)

  // Unsubscribe from browser
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }

  return true
}

export type PushSetupResult = {
  success: boolean
  error?: 'denied' | 'unsupported' | 'registration_failed' | 'subscription_failed' | 'save_failed'
}

export async function setupPushNotifications(): Promise<PushSetupResult> {
  // Check if permission was previously denied by system
  if ('Notification' in window && Notification.permission === 'denied') {
    return { success: false, error: 'denied' }
  }
  
  const permission = await requestNotificationPermission()
  if (permission === 'denied') {
    return { success: false, error: 'denied' }
  }
  if (permission !== 'granted') {
    return { success: false, error: 'unsupported' }
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    return { success: false, error: 'registration_failed' }
  }

  // Wait for service worker to be ready
  await navigator.serviceWorker.ready

  const subscription = await subscribeToPush(registration)
  if (!subscription) {
    return { success: false, error: 'subscription_failed' }
  }

  const saved = await savePushSubscription(subscription)
  if (!saved) {
    return { success: false, error: 'save_failed' }
  }
  
  return { success: true }
}

export function isNotificationDenied(): boolean {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  return Notification.permission === 'denied'
}

export async function forceUpdateServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  
  const registration = await navigator.serviceWorker.getRegistration()
  if (registration) {
    await registration.update()
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false
  }

  // Check if notification permission is granted
  if (Notification.permission !== 'granted') {
    return false
  }

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) {
    return false
  }

  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
