import { EntityManager } from "@/components/admin/EntityManager"
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) { return <EntityManager entity="reviews" searchParams={searchParams} /> }
