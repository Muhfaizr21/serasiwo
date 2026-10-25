import { useContext } from 'react'
import { VendorContext } from './VendorContextObject'

export function useVendor() {
  const context = useContext(VendorContext)
  if (!context) {
    throw new Error('useVendor must be used within a VendorProvider')
  }
  return context
}
