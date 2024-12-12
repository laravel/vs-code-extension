/* eslint-disable @typescript-eslint/naming-convention */
export interface IGithubRelease {
    url: string;
    assets_url: string;
    upload_url: string;
    html_url: string;
    id: number;
    author: object;
    node_id: string;
    tag_name: string;
    target_commitish: string;
    name: string;
    draft: boolean;
    prerelease: boolean;
    created_at: Date;
    published_at: Date;
    assets: IAsset[];
    tarball_url: string;
    zipball_url: string;
    body: string;
    mentions_count: number;
}

interface IAsset {
    url: string;
    id: number;
    node_id: string;
    name: string;
    label: string;
    uploader: object;
    content_type: string;
    state: string;
    size: number;
    download_count: number;
    created_at: Date;
    updated_at: Date;
    browser_download_url: string;
}
