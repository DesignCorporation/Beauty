import Link from 'next/link'
import { Heading, Text } from "@/components/luxury/ui/Typography"
import { Button } from "@/components/luxury/ui/Button"

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-[#F9F7F2] px-6'>
      <div className='max-w-2xl text-center space-y-8'>
        {/* 404 */}
        <div className='space-y-6'>
          <h1 className='text-8xl md:text-9xl font-serif font-bold text-[#D4AF37]/20'>404</h1>
          <Heading variant="h2" className="text-[#1A1A1A]">Page not found</Heading>
          <Text className="max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to the collection.
          </Text>
        </div>

        {/* Navigation */}
        <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
          <Link href='/'>
            <Button variant="primary">Return Home</Button>
          </Link>
          <Link href='/pricing'>
            <Button variant="outline">View Pricing</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}