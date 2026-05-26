class MangaCopy extends ComicSource {

    name = "MangaCopy"

    key = "mangacopy"

    version = "1.0.0"

    minAppVersion = "1.6.0"

    url = ""

    static defaultDomain = "www.mangacopy.com"

    static defaultImageQuality = "1500"

    static searchApi = "/api/kb/web/searchci/comics"

    static categoryParamDict = {
        "全部": "",
        "愛情": "aiqing",
        "歡樂向": "huanlexiang",
        "冒險": "maoxian",
        "奇幻": "qihuan",
        "百合": "baihe",
        "校园": "xiaoyuan",
        "科幻": "kehuan",
        "東方": "dongfang",
        "耽美": "danmei",
        "生活": "shenghuo",
        "格鬥": "gedou",
        "轻小说": "qingxiaoshuo",
        "其他": "qita",
        "悬疑": "xuanyi",
        "TL": "teenslove",
        "萌系": "mengxi",
        "神鬼": "shengui",
        "职场": "zhichang",
        "治愈": "zhiyu",
        "节操": "jiecao",
        "四格": "sige",
        "長條": "changtiao",
        "舰娘": "jianniang",
        "搞笑": "gaoxiao",
        "竞技": "jingji",
        "伪娘": "weiniang",
        "魔幻": "mohuan",
        "热血": "rexue",
        "性转换": "xingzhuanhuan",
        "美食": "meishi",
        "励志": "lizhi",
        "彩色": "COLOR",
        "後宮": "hougong",
        "侦探": "zhentan",
        "惊悚": "jingsong",
        "AA": "aa",
        "音乐舞蹈": "yinyuewudao",
        "异世界": "yishijie",
        "战争": "zhanzheng",
        "历史": "lishi",
        "机战": "jizhan",
        "都市": "dushi",
        "穿越": "chuanyue",
        "C102": "comiket102",
        "重生": "chongsheng",
        "恐怖": "kongbu",
        "C103": "comiket103",
        "生存": "shengcun",
        "C100": "comiket100",
        "C104": "comiket104",
        "C101": "comiket101",
        "C99": "comiket99",
        "C97": "comiket97",
        "武侠": "wuxia",
        "宅系": "zhaixi",
        "C96": "comiket96",
        "C105": "comiket105",
        "C98": "C98",
        "C95": "comiket95",
        "转生": "zhuansheng",
        "FATE": "fate",
        "無修正": "Uncensored",
        "仙侠": "xianxia",
        "LoveLive": "loveLive",
        "雜誌附贈寫真集": "zazhifuzengxiezhenji",
    }

    get siteUrl() {
        let domain = this.loadSetting("domain") || MangaCopy.defaultDomain
        domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
        return `https://${domain}`
    }

    get imageQuality() {
        return this.loadSetting("image_quality") || MangaCopy.defaultImageQuality
    }

    webHeaders(referer) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
            "Referer": referer || `${this.siteUrl}/`,
        }
    }

    async fetchText(url, headers) {
        let res = await fetch(url, {
            headers: headers || this.webHeaders(),
        })
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`
        }
        return await res.text()
    }

    async fetchJson(url, headers) {
        let text = await this.fetchText(url, headers || {
            ...this.webHeaders(),
            "Accept": "application/json,text/plain,*/*",
        })
        return JSON.parse(text)
    }

    decodeHtml(text) {
        if (text === null || text === undefined) {
            return ""
        }
        return text
            .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
            .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
            .replace(/&quot;/g, "\"")
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
    }

    stripHtml(text) {
        return this.decodeHtml((text || "").replace(/<[^>]*>/g, "")).trim()
    }

    statusText(status) {
        if (status === 0) {
            return "連載中"
        }
        if (status === 1 || status === 2) {
            return "已完結"
        }
        return ""
    }

    parseComic(comic) {
        if (comic.comic !== null && comic.comic !== undefined) {
            comic = comic.comic
        }
        let author = null
        if (Array.isArray(comic.author) && comic.author.length > 0) {
            author = comic.author[0].name
        }
        let authorCount = Array.isArray(comic.author) ? comic.author.length : 0
        let tags = []
        if (Array.isArray(comic.theme)) {
            tags = comic.theme.map(e => e.name).filter(e => e)
        }
        let description = comic.datetime_updated || this.statusText(comic.status)
        if (comic.sort !== null && comic.sort !== undefined) {
            description = `${comic.sort}\n${author || ""}\n${comic.popular ? `热度 ${comic.popular}` : ""}`.trim()
        } else if (authorCount > 1 && author) {
            description = `${author} 等${authorCount}位`
        }
        return {
            id: comic.path_word,
            title: comic.name,
            subTitle: author,
            cover: comic.cover,
            tags: tags,
            description: description,
        }
    }

    parseListAttribute(html) {
        let totalMatch = html.match(/class=["'][^"']*exemptComic-box[^"']*["'][^>]*total=["'](\d+)["']/)
        let listMatch = html.match(/class=["'][^"']*exemptComic-box[^"']*["'][^>]*list=["']([\s\S]*?)["']\s*>/)
        if (!listMatch) {
            return {
                list: [],
                total: 0,
            }
        }
        let listText = this.decodeHtml(listMatch[1])
        return {
            list: eval(listText),
            total: totalMatch ? parseInt(totalMatch[1]) : 0,
        }
    }

    async loadComicList(page, theme, ordering) {
        let limit = 50
        let offset = (page - 1) * limit
        ordering = (ordering || "-datetime_updated").replace("*", "-")
        let query = `ordering=${encodeURIComponent(ordering || "-datetime_updated")}&offset=${offset}&limit=${limit}`
        if (theme) {
            query = `theme=${encodeURIComponent(theme)}&${query}`
        }
        let html = await this.fetchText(`${this.siteUrl}/comics?${query}`)
        let parsed = this.parseListAttribute(html)
        return {
            comics: parsed.list.map(e => this.parseComic(e)),
            maxPage: Math.max(1, Math.ceil(parsed.total / limit)),
        }
    }

    parseRankPage(html) {
        let comics = []
        let itemReg = /<div class=["']topThree ranking-all-box["'][\s\S]*?<div class=["']ranking-all-icon[^"']*["']>\s*([^<]+)\s*<\/div>([\s\S]*?)(?=<div class=["']topThree ranking-all-box["']|<\/ul>)/g
        let itemMatch
        while ((itemMatch = itemReg.exec(html)) !== null) {
            let block = itemMatch[2]
            let href = block.match(/href=["']\/comic\/([^"']+)["']/)
            let img = block.match(/data-src=["']([^"']+)["']|src=["']([^"']+)["']/)
            let title = block.match(/title=["']([^"']+)["']|<p[^>]*>\s*([^<]+)\s*<\/p>/)
            let author = block.match(/作者[：:][\s\S]*?<a[^>]*>([^<]+)<\/a>/)
            if (href && title) {
                comics.push({
                    id: href[1],
                    title: this.decodeHtml(title[1] || title[2]),
                    subTitle: author ? this.stripHtml(author[1]) : null,
                    cover: img ? (img[1] || img[2]) : "",
                    tags: [],
                    description: `排行 ${this.stripHtml(itemMatch[1])}`,
                })
            }
        }
        return comics
    }

    async loadRank(type, table) {
        let html = await this.fetchText(`${this.siteUrl}/rank?type=${type || "male"}&table=${table || "day"}`)
        let comics = this.parseRankPage(html)
        return {
            comics: comics,
            maxPage: 1,
        }
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPageComicList",
            load: async (page) => {
                return await this.loadComicList(page, "", "-datetime_updated")
            },
        },
        {
            title: "排行榜",
            type: "multiPageComicList",
            load: async () => {
                return await this.loadRank("male", "day")
            },
        },
    ]

    category = {
        title: "MangaCopy",
        parts: [
            {
                name: "排行榜",
                type: "fixed",
                categories: ["排行"],
                categoryParams: ["ranking"],
                itemType: "category",
            },
            {
                name: "題材",
                type: "fixed",
                categories: Object.keys(MangaCopy.categoryParamDict),
                categoryParams: Object.values(MangaCopy.categoryParamDict),
                itemType: "category",
            },
        ],
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            options = options || []
            if (category === "排行" || param === "ranking") {
                return await this.loadRank(options[0] || "male", options[1] || "day")
            }
            if (category !== undefined && category !== null) {
                param = MangaCopy.categoryParamDict[category] || ""
            }
            return await this.loadComicList(page, param, options[0] || "*datetime_updated")
        },
        optionList: [
            {
                label: "排序",
                options: [
                    "*datetime_updated-时间倒序",
                    "datetime_updated-时间正序",
                    "*popular-热度倒序",
                    "popular-热度正序",
                ],
                showWhen: Object.keys(MangaCopy.categoryParamDict),
            },
            {
                label: "频道",
                options: [
                    "male-男频",
                    "female-女频",
                ],
                showWhen: ["排行"],
            },
            {
                label: "榜单",
                options: [
                    "day-日榜",
                    "week-周榜",
                    "month-月榜",
                    "total-总榜",
                ],
                showWhen: ["排行"],
            },
        ],
    }

    search = {
        load: async (keyword, options, page) => {
            let qType = options && options[0] ? options[0] : ""
            let limit = 12
            let offset = (page - 1) * limit
            let url = `${this.siteUrl}${MangaCopy.searchApi}?offset=${offset}&platform=2&limit=${limit}&q=${encodeURIComponent(keyword)}&q_type=${encodeURIComponent(qType)}`
            let data = await this.fetchJson(url)
            if (data.code !== 200) {
                throw data.message || "Search failed"
            }
            return {
                comics: data.results.list.map(e => this.parseComic(e)),
                maxPage: Math.max(1, Math.ceil(data.results.total / limit)),
            }
        },
        optionList: [
            {
                type: "select",
                options: [
                    "-全部",
                    "name-名称",
                    "author-作者",
                    "local-汉化组",
                ],
                label: "搜索选项",
            },
        ],
    }

    hexToArrayBuffer(hex) {
        let bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
        }
        return bytes.buffer
    }

    decryptPayload(payload, key) {
        let iv = Convert.encodeUtf8(payload.substring(0, 16))
        let encrypted = this.hexToArrayBuffer(payload.substring(16))
        let decrypted = Convert.decryptAesCbc(encrypted, Convert.encodeUtf8(key), iv)
        return Convert.decodeUtf8(decrypted).trim()
    }

    extractVar(html, name) {
        let reg = new RegExp(`var\\s+${name}\\s*=\\s*['"]([^'"]+)['"]`)
        let match = html.match(reg)
        return match ? match[1] : null
    }

    async loadChapterMap(comicId, detailHtml) {
        let key = this.extractVar(detailHtml, "ccz") || "op0zzpvv.nmn.00p"
        let dntMatch = detailHtml.match(/id=["']dnt["'][^>]*value=["']([^"']+)["']/)
        let dnts = dntMatch ? dntMatch[1] : "3"
        let data = await this.fetchJson(`${this.siteUrl}/comicdetail/${comicId}/chapters`, {
            ...this.webHeaders(`${this.siteUrl}/comic/${comicId}`),
            "Accept": "application/json,text/plain,*/*",
            "dnts": dnts,
        })
        if (data.code !== 200 || !data.results) {
            throw data.message || "Failed to load chapters"
        }
        let chapterData = JSON.parse(this.decryptPayload(data.results, key))
        let chapters = new Map()
        let groups = chapterData.groups || {}
        for (let groupKey of Object.keys(groups)) {
            let group = groups[groupKey]
            let groupName = group.name || groupKey
            let list = group.chapters || []
            for (let ep of list) {
                let title = ep.name
                if (groupName !== "默認" && groupName !== "默认" && groupName !== "default") {
                    title = `${groupName} - ${title}`
                }
                chapters.set(ep.id, title)
            }
        }
        return chapters
    }

    comic = {
        loadInfo: async (id) => {
            let html = await this.fetchText(`${this.siteUrl}/comic/${id}`)
            let titleMatch = html.match(/<h6[^>]*title=["']([^"']+)["'][^>]*>/)
            let coverMatch = html.match(/comicParticulars-left-img[\s\S]*?(?:data-src|src)=["']([^"']+)["']/)
            let briefMatch = html.match(/<p[^>]*class=["']intro["'][^>]*>([\s\S]*?)<\/p>/)
            let statusMatch = html.match(/<span>\s*狀態：\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/)
            let updateMatch = html.match(/最後更新：\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/)

            let authors = []
            let authorReg = /\/author\/[^"']+\/comics["'][^>]*>([^<]+)<\/a>/g
            let authorMatch
            while ((authorMatch = authorReg.exec(html)) !== null) {
                authors.push(this.stripHtml(authorMatch[1]))
            }

            let themes = []
            let themeReg = /\/comics\?theme=[^"']+["'][^>]*>#?([^<]+)<\/a>/g
            let themeMatch
            while ((themeMatch = themeReg.exec(html)) !== null) {
                themes.push(this.stripHtml(themeMatch[1]))
            }

            let chapters = await this.loadChapterMap(id, html)
            let updateTime = updateMatch ? this.stripHtml(updateMatch[1]) : ""
            let status = statusMatch ? this.stripHtml(statusMatch[1]) : ""

            return {
                title: titleMatch ? this.decodeHtml(titleMatch[1]) : id,
                cover: coverMatch ? coverMatch[1] : "",
                description: briefMatch ? this.stripHtml(briefMatch[1]) : "",
                tags: {
                    "作者": authors,
                    "更新": updateTime ? [updateTime] : [],
                    "标签": themes,
                    "状态": status ? [status] : [],
                },
                chapters: chapters,
                url: `${this.siteUrl}/comic/${id}`,
            }
        },
        loadEp: async (comicId, epId) => {
            let url = `${this.siteUrl}/comic/${comicId}/chapter/${epId}`
            let html = await this.fetchText(url, this.webHeaders(`${this.siteUrl}/comic/${comicId}`))
            let key = this.extractVar(html, "cct") || "op0zzpvv.nmn.00p"
            let payload = this.extractVar(html, "contentKey")
            if (!payload) {
                throw "Failed to find chapter image data"
            }
            let list = JSON.parse(this.decryptPayload(payload, key))
            let images = list.map(e => e.url).filter(e => e)
            images = images.map(e => e.replace(/\.c\d+x\./, `.c${this.imageQuality}x.`))
            return {
                images: images,
            }
        },
        onImageLoad: (url, comicId, epId) => {
            return {
                headers: this.webHeaders(`${this.siteUrl}/comic/${comicId}/chapter/${epId}`),
            }
        },
        onThumbnailLoad: (url) => {
            return {
                headers: this.webHeaders(),
            }
        },
        onClickTag: (namespace, tag) => {
            if (namespace === "标签") {
                return {
                    action: "category",
                    keyword: tag,
                    param: null,
                }
            }
            if (namespace === "作者") {
                return {
                    action: "search",
                    keyword: tag,
                    param: null,
                }
            }
            throw "未支持此类Tag检索"
        },
        idMatch: "mangacopy\\.com/comic/([^/?#]+)",
        link: {
            domains: [
                "www.mangacopy.com",
                "mangacopy.com",
            ],
            linkToId: (url) => {
                let match = url.match(/mangacopy\.com\/comic\/([^/?#]+)/)
                return match ? match[1] : null
            },
        },
    }

    settings = {
        domain: {
            title: "网站域名",
            type: "input",
            validator: "^(?!:\\/\\/)(?=.{1,253})([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$",
            default: MangaCopy.defaultDomain,
        },
        image_quality: {
            title: "图片质量",
            type: "select",
            options: [
                {
                    value: "800",
                    text: "低 (800)",
                },
                {
                    value: "1200",
                    text: "中 (1200)",
                },
                {
                    value: "1500",
                    text: "高 (1500)",
                },
            ],
            default: MangaCopy.defaultImageQuality,
        },
    }
}
