import Link from "next/link";
import { Card } from "./ui/card";

export interface QuickLink {
    uri: string
    linkText: string
}

interface QuickLinksProps {
    links: QuickLink[];
}

const QuickLinksCard = ({ links } : QuickLinksProps) => {
    return <Card title="Quick Links">
        {links && links.length > 0 ? (
            <ul className="space-y-2 m-0">
                {links.map((link) => (
                <li key={link.uri}>
                    <Link href={link.uri} target="_blank">{link.linkText}</Link>
                </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-gray-500">No quick links available.</p>
        )}
    </Card>
}

export default QuickLinksCard;