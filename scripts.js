function handleImageError(imgElement) {
    const sources = imgElement.dataset.sources.split(',');
    let currentIndex = parseInt(imgElement.dataset.current || 0);
    
    if (currentIndex < sources.length - 1) {
        currentIndex++;
        imgElement.style.backgroundImage = `url('${sources[currentIndex]}')`;
        imgElement.dataset.current = currentIndex;
    } else {
        imgElement.style.backgroundColor = '#f0f0f0';
        imgElement.innerHTML = '<p style="color:#999;padding:20px">图片加载失败</p>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const lockScreen = document.getElementById('lockScreen');
    const mainContent = document.getElementById('mainContent');
    const body = document.body;
    const swipeHint = document.querySelector('.swipe-hint');
    const blurBg = document.querySelector('.blur-bg');
    const dailyQuote = document.getElementById('dailyQuote');
    
    // 文章详情页面相关元素
    const articleLinks = document.querySelectorAll('.post-link, .read-more');
    const closeArticleBtn = document.getElementById('closeArticle');
    const articleTitle = document.getElementById('articleTitle');
    const articleDate = document.getElementById('articleDate');
    const articleContent = document.getElementById('articleContent');
    const blurToggle = document.getElementById('blurToggle');
    const articleDetailPage = document.querySelector('.article-detail-page');
    
    // 预加载文章内容
    const articleContents = {};
    // 获取所有文章链接
    articleLinks.forEach((link) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取文章路径
            const articlePath = this.getAttribute('href');
            
            // 获取文章信息
            const article = this.closest('.blog-post');
            const title = article.querySelector('.post-title').textContent;
            
            // 获取文章缩略图URL
            let thumbnailUrl = '';
            const thumbnailImg = article.querySelector('.post-thumbnail');
            if (thumbnailImg && thumbnailImg.src) {
                thumbnailUrl = thumbnailImg.src;
            }
            
            // 打开文章详情页
            openArticleDetail(articlePath, title, thumbnailUrl);
        });
    });
    
    // 添加文章详情页加载功能
    function openArticleDetail(articlePath, title, thumbnailUrl) {
        // 设置文章详情页背景和标题
        if (thumbnailUrl) {
            articleDetailPage.style.backgroundImage = `url('${thumbnailUrl}')`;
            articleDetailPage.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        }
        
        document.getElementById('articleTitle').textContent = title;
        const articleContentElement = document.getElementById('articleContent'); // 获取文章内容容器
        articleContentElement.innerHTML = '<p class="loading-text">正在加载文章内容...</p>';
        
        // 清空旧目录
        const tocList = document.getElementById('tocList');
        if (tocList) {
            tocList.innerHTML = ''; // 清空上一次生成的目录
        }
        
        // 使用XMLHttpRequest替代fetch
        const xhr = new XMLHttpRequest();
        xhr.open('GET', articlePath, true);
        
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400) {
                console.log('成功获取文章内容');
                
                const parser = new DOMParser();
                const doc = parser.parseFromString(xhr.responseText, 'text/html');
                
                // --- 扩展内容选择器，加入 .typora-export-content ---
                let content = doc.querySelector('.post-content');
                if (!content) {
                    content = doc.querySelector('.article-content');
                }
                if (!content) {
                    content = doc.querySelector('.entry-content');
                }
                // *** 新增：检查 typora 导出的内容容器 ***
                if (!content) {
                    content = doc.querySelector('.typora-export-content');
                if (content) {
                        console.log('[Content] Found content within .typora-export-content');
                    }
                }
                // *** 结束新增检查 ***
                if (!content) {
                    content = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('.content');
                }
                // --- 结束扩展选择器 ---
                
                if (content) {
                    articleContentElement.innerHTML = content.innerHTML; // 插入文章内容

                    // 调用增强版的图片修复函数
                    fixArticleImages(articlePath, articleContentElement);

                    // --- 使用 requestAnimationFrame 确保 DOM 更新后再执行 ---
                    requestAnimationFrame(() => {
                        // 尝试再次获取日期（以防万一）
                        const postDateElement = articleContentElement.querySelector('.post-date, .article-date, .entry-date');
                        if (postDateElement) {
                            document.getElementById('articleDate').textContent = postDateElement.textContent;
                        } else {
                            // 如果在插入后找不到，尝试从原始解析的文档中获取
                            const parsedDate = doc.querySelector('.post-date, .article-date, .entry-date');
                            document.getElementById('articleDate').textContent = parsedDate ? parsedDate.textContent : ''; // 找不到则清空
                        }

                        // --- 开始：生成目录 ---
                        if (tocList) {
                            tocList.innerHTML = ''; // 清空上一次生成的目录
                            const headings = articleContentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            console.log(`[TOC] Found ${headings.length} headings in #articleContent.`);

                            if (headings.length > 0) {
                                headings.forEach((heading, index) => {
                                    const headingText = heading.textContent.trim();
                                    if (!headingText) {
                                        console.log(`[TOC] Skipping empty heading at index ${index}.`);
                                        return;
                                    }

                                    // --- 优先使用现有 ID，否则生成新 ID ---
                                    let headingId = heading.id; // 尝试获取现有 ID
                                    if (!headingId) {
                                        // 如果没有 ID，生成一个基于索引的唯一 ID
                                        headingId = `toc-heading-${index}`;
                                        heading.id = headingId; // 设置到标题元素上
                                        console.log(`[TOC] Generated ID ${headingId} for heading: ${headingText}`);
                } else {
                                        console.log(`[TOC] Using existing ID ${headingId} for heading: ${headingText}`);
                                    }
                                    // --- 结束 ID 处理 ---

                                    const li = document.createElement('li');
                                    const link = document.createElement('a');
                                    link.href = `#${headingId}`; // 使用最终确定的 ID

                                    // --- 恢复 span 结构 (保持不变) ---
                                    const span = document.createElement('span');
                                    span.textContent = headingText;
                                    link.appendChild(span);
                                    // --- 结束恢复 ---

                                    li.classList.add(`toc-level-${heading.tagName.toLowerCase()}`);

                                    // 添加平滑滚动点击事件 (保持不变)
                                    link.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        const targetElement = document.getElementById(headingId);
                                        if (targetElement) {
                                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                    });

                                    li.appendChild(link);
                                    tocList.appendChild(li);
                                });
                            } else {
                                // 如无标题，则在目录中显示提示文字
                                const li = document.createElement('li');
                                li.textContent = '无目录';
                                li.style.fontStyle = 'italic'; // 可以给提示加点样式
                                tocList.appendChild(li);
                                console.log('[TOC] No headings found, displaying "无目录".'); // 添加调试日志
                            }
                        } else {
                            console.warn('[TOC] tocList element not found.');
                        }
                        // --- 结束：生成目录 ---
                    }); // 结束 requestAnimationFrame
                } else {
                    console.error('未找到内容元素，无法生成目录');
                    // 如果找不到内容容器，也清空目录区域
                    if (tocList) {
                        tocList.innerHTML = '<li style="font-style: italic;">无法加载内容</li>';
                    }
                    // 如果找不到任何内容容器，则使用整个body内容（除去head）
                    const bodyContent = doc.body;
                    if (bodyContent) {
                        // 移除脚本标签，防止执行不必要的脚本
                        const scripts = bodyContent.querySelectorAll('script');
                        scripts.forEach(script => script.remove());
                        
                        articleContentElement.innerHTML = bodyContent.innerHTML;
                        showToast('文章格式不标准，但已尽可能显示内容', 'warning');
                    } else {
                        articleContentElement.innerHTML = `
                        <div class="error-message">
                            <h3>加载文章失败</h3>
                                <p>无法解析文章内容</p>
                        </div>
                    `;
                        showToast('文章内容解析失败', 'error');
                    }
                }
            } else {
                handleArticleError(xhr.statusText || '文件访问错误', articlePath);
            }
        };
        
        xhr.onerror = function() {
            handleArticleError('无法访问文件，请使用本地服务器', articlePath);
        };
        
        xhr.send();
        
        // 打开文章详情页
        document.body.classList.add('article-open');
        articleDetailPage.classList.remove('closing');
    }
    
    function handleArticleError(errorMsg, articlePath) {
        console.error('加载文章失败:', errorMsg, '路径:', articlePath);
        document.getElementById('articleContent').innerHTML = `
            <div class="error-message">
                <h3>加载文章失败</h3>
                <p>${errorMsg}</p>
                <p>文章路径: ${articlePath}</p>
                <p><strong>解决方案:</strong></p>
                <ol>
                    <li>使用本地服务器运行此网站（推荐）：
                        <ul>
                            <li>VS Code用户: 安装Live Server插件</li>
                            <li>Python用户: 在网站目录运行 <code>python -m http.server</code></li>
                            <li>Node.js用户: 安装 <code>npm install -g http-server</code> 然后运行 <code>http-server</code></li>
                        </ul>
                    </li>
                    <li>或尝试使用Chrome浏览器，并添加<code>--allow-file-access-from-files</code>参数启动</li>
                </ol>
            </div>
        `;
    }
    
    // 关闭文章详情页面 - 修改为在关闭时重置背景
    closeArticleBtn.addEventListener('click', function() {
        // 不立即移除类，而是先添加过渡类
        articleDetailPage.classList.add('closing');
        
        // 添加主内容区域的过渡动画
        mainContent.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), filter 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
        
        // 重置主内容区域的位置和模糊效果
        mainContent.style.transform = 'translateX(0)';
        mainContent.style.filter = 'blur(0px)';
        
        // 文章内容也需要过渡
        articleContent.style.opacity = '0';
        articleContent.style.transform = 'translateX(20px)';
        
        // 等待过渡动画完成后，再移除类并清空内容
        setTimeout(() => {
            body.classList.remove('article-open');
            articleDetailPage.classList.remove('closing');
            
            // 彻底清除所有内联样式
            mainContent.removeAttribute('style');
            articleContent.removeAttribute('style');
            
            // 重置文章详情页背景
            articleDetailPage.style.backgroundImage = '';
            articleDetailPage.style.backgroundColor = '';
            
            // 延迟清空内容
            setTimeout(() => {
                articleContent.innerHTML = '<p>加载中...</p>';
            }, 100);
        }, 500);
    });
    
    // 修改每日一语数据获取方式 - 从网络API获取
    function fetchDailyQuote() {
        // 显示加载状态
        dailyQuote.textContent = "正在获取每日一言...";
        
        // 使用一言API获取随机句子
        fetch('https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=h&c=i&c=j&c=k')
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络请求失败');
                }
                return response.json();
            })
            .then(data => {
                // 显示获取的句子和来源
                const quoteText = data.hitokoto;
                const quoteSource = data.from ? `——《${data.from}》` : '';
                
                // 设置显示内容
                dailyQuote.innerHTML = `${quoteText}<br><span class="quote-source">${quoteSource}</span>`;
                
                // 保存到本地存储，以便离线使用
                const savedQuote = {
                    text: quoteText,
                    source: quoteSource,
                    timestamp: new Date().getTime()
                };
                localStorage.setItem('dailyQuote', JSON.stringify(savedQuote));
            })
            .catch(error => {
                console.error('获取每日一言失败:', error);
                
                // 尝试从本地存储获取上次保存的内容
                const savedQuote = localStorage.getItem('dailyQuote');
                if (savedQuote) {
                    try {
                        const { text, source } = JSON.parse(savedQuote);
                        dailyQuote.innerHTML = `${text}<br><span class="quote-source">${source}</span>`;
                        dailyQuote.innerHTML += '<br><small>(离线模式)</small>';
                    } catch (e) {
                        // 如果解析失败，使用备用内容
                        useFallbackQuote();
                    }
                } else {
                    // 如果没有本地存储，使用备用内容
                    useFallbackQuote();
                }
            });
    }
    
    // 备用的每日一言内容
    function useFallbackQuote() {
        const fallbackQuotes = [
            "生活不是等待风暴过去，而是学会在雨中翩翩起舞。",
            "人生就像一本书，愚蠢的人走马观花，聪明的人细细品读。",
            "成功不是将来才有的，而是从决定去做的那一刻起就已经开始的。",
            "不要等待机会，而要创造机会。",
            "生活中最难的阶段不是没有人懂你，而是你不懂你自己。"
        ];
        
        const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
        dailyQuote.textContent = fallbackQuotes[randomIndex];
    }
    
    // 获取每日一言
    fetchDailyQuote();
    
    // 触摸事件变量
    let startY = 0;
    let currentY = 0;
    let isLocked = true;
    
    // 修改点击解锁功能，点击每日一语区域触发
    swipeHint.addEventListener('click', function(e) {
        if (!isLocked) return;
        
        // 防止点击事件与滑动事件冲突
        if (Math.abs(startY - currentY) > 10) return;
        
        // 动画解锁效果
        animateUnlock();
        
        // 阻止事件冒泡
        e.stopPropagation();
    });
    
    // 更优化的缓动函数
    function easeOutExpo(x) {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    // 添加弹性缓动函数
    function easeOutElastic(x) {
        const c4 = (2 * Math.PI) / 3;
        return x === 0 ? 0 : x === 1 ? 1 :
            Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
    
    // 解锁动画函数 - 没有推拉效果
    function animateUnlock() {
        let progress = 0;
        const animationDuration = 500;
        const startTime = performance.now();
        
        // 获取当前的模糊值作为起点
        const currentFilter = getComputedStyle(lockScreen).filter;
        const currentBlur = currentFilter.includes('blur') ? 
            parseFloat(currentFilter.match(/blur\(([^)]+)\)/)[1]) : 0;
        
        // 获取主内容区域
        const mainContent = document.getElementById('mainContent');
        
        // 初始时主内容区域只是模糊，没有位移
        mainContent.style.filter = 'blur(20px)';
        
        // 立即触发博客元素动画，不等待解锁完成
        triggerBlogElementAnimations();
        
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            progress = Math.min(elapsedTime / animationDuration, 1);
            
            // 使用更平滑的缓动函数
            const easedProgress = easeOutExpo(progress);
            
            // 应用动画效果 - 平滑过渡模糊效果
            lockScreen.style.transform = `translateY(-${easedProgress * 100}%)`;
            
            // 从当前模糊值平滑过渡到最终模糊值
            const blurValue = currentBlur + (40 - currentBlur) * easedProgress;
            lockScreen.style.filter = `blur(${blurValue}px)`;
            
            // 主内容区域从模糊变清晰，但没有位移
            mainContent.style.filter = `blur(${(1 - easedProgress) * 20}px)`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成后，应用解锁类
                body.classList.add('unlocked');
                isLocked = false;
                
                // 重置内联样式，使用类来控制
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                mainContent.style.filter = '';
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    // 完成解锁动画 - 添加主内容区域模糊效果的清除
    function completeUnlockAnimation() {
        // 获取当前transform值作为起点
        const currentTransform = getComputedStyle(lockScreen).transform;
        const matrix = new DOMMatrix(currentTransform);
        const currentY = matrix.m42;
        
        // 计算起始位移进度
        let startProgress = Math.abs(currentY) / (window.innerHeight * 0.3);
        startProgress = Math.min(startProgress, 0.8);
        
        // 获取当前的模糊值
        const currentFilter = getComputedStyle(lockScreen).filter;
        const currentBlur = currentFilter.includes('blur') ? 
            parseFloat(currentFilter.match(/blur\(([^)]+)\)/)[1]) : 0;
        
        // 使用更长的动画时间，确保过渡更平滑
        const animationDuration = 400 * (1 - startProgress);
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const animProgress = Math.min(elapsedTime / animationDuration, 1);
            
            // 使用平滑的缓动函数
            const easedProgress = easeOutExpo(animProgress);
            
            // 计算当前位移进度
            const transformProgress = startProgress + (1 - startProgress) * easedProgress;
            
            // 应用动画效果 - 平滑过渡模糊效果
            lockScreen.style.transform = `translateY(-${transformProgress * 100}%)`;
            
            // 从当前模糊值平滑过渡到最终模糊值
            const blurValue = currentBlur + (40 - currentBlur) * easedProgress;
            lockScreen.style.filter = `blur(${blurValue}px)`;
            
            // 主内容区域从模糊变清晰
            mainContent.style.filter = `blur(${(1 - easedProgress) * 20}px)`;
            
            if (animProgress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成后，应用解锁类
                body.classList.add('unlocked');
                isLocked = false;
                
                // 重置内联样式，使用类来控制
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                mainContent.style.filter = '';
                mainContent.style.transform = '';
                
                // 立即触发博客元素动画，不等待解锁完成
                triggerBlogElementAnimations();
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    // 触发博客元素动画 - 修改为从屏幕外飞入
    function triggerBlogElementAnimations() {
        const navbar = document.querySelector('.blog-navbar');
        const posts = document.querySelectorAll('.blog-post');
        const sidebar = document.querySelector('.sidebar');
        const profileCard = document.querySelector('.author-card');
        const categoriesCard = document.querySelector('.categories-card');
        const tagsCard = document.querySelector('.tags-card');
        
        // 触发导航栏动画 - 从上方飞入
        if (navbar) {
            navbar.style.animation = 'slideInDown 0.8s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
        
        // 触发文章卡片动画 - 从下方飞入
        posts.forEach((post, index) => {
            post.style.animation = `fadeInUp 0.8s ${0.1 + index * 0.1}s cubic-bezier(0.23, 1, 0.32, 1) forwards`;
        });
        
        // 触发整个侧边栏动画 - 从右侧飞入
        if (sidebar) {
            sidebar.classList.add('animate');
        }
        
        // 保留现有的单独元素动画以兼容旧代码
        if (profileCard) {
            profileCard.style.animation = 'fadeInRight 0.8s 0.2s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
        
        if (categoriesCard) {
            categoriesCard.style.animation = 'fadeInRight 0.8s 0.4s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
        
        if (tagsCard) {
            tagsCard.style.animation = 'fadeInRight 0.8s 0.6s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
    }
    
    // 在页面加载时，确保元素处于初始位置（屏幕外）
    function resetElementPositions() {
        const navbar = document.querySelector('.blog-navbar');
        const posts = document.querySelectorAll('.blog-post');
        const sidebar = document.querySelector('.sidebar');
        const profileCard = document.querySelector('.profile-card');
        const categoriesCard = document.querySelector('.categories-card');
        const tagsCard = document.querySelector('.tags-card');
        
        if (navbar) {
            navbar.style.transform = 'translateY(-100px)';
            navbar.style.opacity = '0';
        }
        
        posts.forEach(post => {
            post.style.transform = 'translateY(100px)';
            post.style.opacity = '0';
        });
        
        // 重置侧边栏位置
        if (sidebar) {
            sidebar.classList.remove('animate');
            sidebar.style.transform = 'translateX(100px)';
            sidebar.style.opacity = '0';
        }
        
        // 保留现有的单独元素重置
        if (profileCard) {
            profileCard.style.transform = 'translateX(100px)';
            profileCard.style.opacity = '0';
        }
        
        if (categoriesCard) {
            categoriesCard.style.transform = 'translateX(100px)';
            categoriesCard.style.opacity = '0';
        }
        
        if (tagsCard) {
            tagsCard.style.transform = 'translateX(100px)';
            tagsCard.style.opacity = '0';
        }
    }
    
    // 页面加载时重置元素位置
    resetElementPositions();
    
    // 触摸开始
    document.addEventListener('touchstart', function(e) {
        if (!isLocked) return;
        startY = e.touches[0].clientY;
        currentY = startY;
    });
    
    // 触摸移动 - 使用easeOutExpo缓动
    document.addEventListener('touchmove', function(e) {
        if (!isLocked) return;
        
        currentY = e.touches[0].clientY;
        const diffY = startY - currentY;
        
        // 只允许向上滑动
        if (diffY > 0) {
            // 计算锁屏界面的位移，应用缓动曲线
            const rawProgress = Math.min(diffY / 200, 1);
            const progress = easeOutExpo(rawProgress); // 使用easeOutExpo缓动
            
            // 应用窗帘式效果 - 锁屏向上移动
            lockScreen.style.transform = `translateY(-${progress * 30}%)`;
            
            // 将模糊效果应用到整个锁屏界面，而不是背景
            lockScreen.style.filter = `blur(${progress * 40}px)`;
            // 保持背景不模糊，避免双重模糊效果
            blurBg.style.filter = 'blur(0px)';
        }
    });
    
    // 触摸结束 - 重置或完成模糊效果
    document.addEventListener('touchend', function() {
        if (!isLocked) return;
        
        const diffY = startY - currentY;
        
        // 如果滑动距离足够，使用动画函数完成解锁
        if (diffY > 100) {
            // 从当前位置开始动画完成解锁
            completeUnlockAnimation();
        } else {
            // 否则使用动画恢复原位
            resetLockScreenAnimation();
        }
    });
    
    // 重置锁屏动画 - 使用弹性缓动
    function resetLockScreenAnimation() {
        // 获取当前transform值
        const currentTransform = getComputedStyle(lockScreen).transform;
        const matrix = new DOMMatrix(currentTransform);
        const currentY = matrix.m42;
        
        // 计算起始进度
        let startProgress = Math.abs(currentY) / (window.innerHeight * 0.3);
        startProgress = Math.min(startProgress, 1);
        
        // 获取当前的模糊值
        const currentFilter = getComputedStyle(lockScreen).filter;
        const currentBlur = currentFilter.includes('blur') ? 
            parseFloat(currentFilter.match(/blur\(([^)]+)\)/)[1]) : 0;
        
        // 计算起始模糊进度
        const blurStartProgress = currentBlur / 40;
        
        const animationDuration = 300 * startProgress;
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const animProgress = Math.min(elapsedTime / animationDuration, 1);
            
            // 使用弹性缓动函数，添加轻微回弹效果
            const easedProgress = easeOutElastic(animProgress);
            
            // 计算当前进度，从起始进度平滑过渡到0
            const transformProgress = startProgress * (1 - easedProgress);
            const blurProgress = blurStartProgress * (1 - easedProgress);
            
            // 应用动画效果 - 模糊整个锁屏
            lockScreen.style.transform = `translateY(-${transformProgress * 30}%)`;
            lockScreen.style.filter = `blur(${blurProgress * 40}px)`;
            
            if (animProgress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 重置样式
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                blurBg.style.filter = '';
            }
        }
        
        requestAnimationFrame(animate);
    }

    // 添加返回锁屏按钮引用和事件处理
    const backToLock = document.getElementById('backToLock');
    
    // 添加返回锁屏按钮点击事件
    backToLock.addEventListener('click', function() {
        if (isLocked) return;
        
        // 添加返回动画类
        mainContent.classList.add('returning');
        
        // 使用动画返回锁屏
        backToLockAnimation();
    });
    
    // 添加按钮点击视觉反馈
    backToLock.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.95)';
    });
    
    backToLock.addEventListener('mouseup', function() {
        this.style.transform = '';
    });
    
    // 返回锁屏动画函数 - 执行与解锁动画相反的窗帘式下拉动画
    function backToLockAnimation() {
        const lockScreen = document.getElementById('lockScreen');
        const mainContent = document.getElementById('mainContent');
        const body = document.body;
        const animationDuration = 550; // 保持与解锁动画时长一致
        const startTime = performance.now();
        
        console.log("Starting backToLockAnimation..."); // 调试信息

        // 1. 准备动画：重置元素状态为下次解锁做准备
        resetElementPositions();
        
        // 2. 设置动画初始状态并禁用 CSS 过渡，防止冲突
        //    移除可能干扰动画的类
        if (mainContent) {
            mainContent.classList.remove('returning'); // 在动画开始前移除
            mainContent.style.transition = 'none';
            mainContent.style.filter = 'blur(0px)'; // 主内容初始清晰
            mainContent.offsetHeight; // 强制浏览器重绘以应用样式
        }
        lockScreen.style.transition = 'none';
        lockScreen.style.transform = 'translateY(-100%)'; // 锁屏初始位置：屏幕正上方
        lockScreen.style.filter = 'blur(0px)';        // 锁屏初始清晰
        lockScreen.offsetHeight; // 强制浏览器重绘以应用样式

        // 3. 定义动画帧更新逻辑
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            let progress = Math.min(elapsedTime / animationDuration, 1);
            // 使用与解锁相同的缓动函数，确保动画节奏一致
            const easedProgress = easeOutExpo(progress);
            
            // --- 核心动画：反向执行解锁动画 ---
            // a) 锁屏 Y 轴位移：从 -100% (顶部) -> 0% (完全覆盖)
            const translateY = (1 - easedProgress) * -100;
            lockScreen.style.transform = `translateY(${translateY}%)`;

            // b) 模糊效果：从 0px -> 最大模糊度
            //    (注意：若 body 有 no-blur 类，此 filter 会被 CSS !important 覆盖，视觉上无模糊)
            const lockBlur = easedProgress * 40;
            const contentBlur = easedProgress * 20;
            lockScreen.style.filter = `blur(${lockBlur}px)`;
            if (mainContent) {
                mainContent.style.filter = `blur(${contentBlur}px)`;
            }
            // --- 动画结束 ---

            // 4. 判断动画是否继续
            if (progress < 1) {
                requestAnimationFrame(animate); // 继续下一帧
            } else {
                // 5. 动画完成：清理和设置最终状态
                console.log("backToLockAnimation finished."); // 调试信息
                body.classList.remove('unlocked'); // 设置为锁定状态
                isLocked = true;
                
                // 清理动画过程中添加的内联样式，让 CSS 规则接管
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                lockScreen.style.transition = ''; // 确保清除 transition:none
                if (mainContent) {
                mainContent.style.filter = '';
                    mainContent.style.transform = ''; // 确保主内容的 transform 也被清除
                    mainContent.style.transition = '';
                }
                // .returning 类已在动画开始前移除
            }
        }

        // 启动动画循环
        requestAnimationFrame(animate);
    }
    
    // 修复图片显示问题
    const postThumbnails = document.querySelectorAll('.post-thumbnail');
    postThumbnails.forEach(img => {
        // 确保图片路径正确
        if (img.getAttribute('src')) {
            // 检查图片路径是否为相对路径
            const currentSrc = img.getAttribute('src');
            
            // 如果是相对路径且不是以/或./开头，添加./前缀
            if (!currentSrc.startsWith('http') && !currentSrc.startsWith('/') && !currentSrc.startsWith('./')) {
                img.setAttribute('src', './' + currentSrc);
            }
            
            // 如果图片路径包含blog/，尝试修复路径
            if (currentSrc.includes('blog/')) {
                const fixedSrc = currentSrc.replace('blog/', './blog/');
                img.setAttribute('src', fixedSrc);
            }
        }
        
        // 添加错误处理
        img.onerror = function() {
            console.log('图片加载失败:', this.src);
            this.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 500 300%22%3E%3Crect fill%3D%22%23f8f8f8%22 width%3D%22500%22 height%3D%22300%22%2F%3E%3Ctext fill%3D%22%23aaa%22 font-family%3D%22Arial%2C sans-serif%22 font-size%3D%2220%22 x%3D%22250%22 y%3D%22150%22 text-anchor%3D%22middle%22 dominant-baseline%3D%22middle%22%3E图片加载失败%3C%2Ftext%3E%3C%2Fsvg%3E';
            this.classList.add('error');
        };
    });
    
    // 尝试直接设置图片路径
    const firstPostImage = document.querySelector('.blog-post:first-child .post-thumbnail');
    if (firstPostImage) {
        firstPostImage.src = './images/post1.jpg';
    }
    
    const secondPostImage = document.querySelector('.blog-post:nth-child(2) .post-thumbnail');
    if (secondPostImage) {
        secondPostImage.src = './images/post2.jpg';
    }
    
    const thirdPostImage = document.querySelector('.blog-post:nth-child(3) .post-thumbnail');
    if (thirdPostImage) {
        thirdPostImage.src = './images/post3.jpg';
    }

    // 添加定时刷新功能（可选，每小时刷新一次）
    setInterval(fetchDailyQuote, 3600000); // 3600000毫秒 = 1小时

    // 添加到现有JavaScript代码中
    function adjustFullscreenHeight() {
        // 获取真实视口高度
        const vh = window.innerHeight * 0.01;
        // 应用到CSS变量
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // 直接设置锁屏元素高度
        const lockScreen = document.getElementById('lockScreen');
        if (lockScreen) {
            lockScreen.style.height = `${window.innerHeight}px`;
        }
    }

    // 初次加载和调整窗口大小时执行
    window.addEventListener('DOMContentLoaded', adjustFullscreenHeight);
    window.addEventListener('resize', adjustFullscreenHeight);
    window.addEventListener('orientationchange', adjustFullscreenHeight);

    // 处理关于弹窗
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutModal = document.getElementById('closeAboutModal');
    const aboutLinks = document.querySelectorAll('a[href="#about"]'); // 所有链接到#about的<a>元素
    
    // 打开关于弹窗
    function openAboutModal() {
        console.log('打开关于弹窗');
        
        // 先显示模态框但不添加active类
        aboutModal.style.visibility = 'visible';
        
        // 强制重绘以确保初始状态被正确应用
        aboutModal.offsetHeight;
        
        // 添加active类触发动画
        aboutModal.classList.add('active');
        
        // 添加背景模糊
        if (mainContent) {
            mainContent.style.transition = 'filter 0.5s ease';
            mainContent.style.filter = 'blur(5px)';
        }
        
        // 锁定背景滚动
        document.body.style.overflow = 'hidden';
    }
    
    // 关闭关于弹窗
    function closeModal() {
        console.log('关闭关于弹窗');
        
        // 移除active类，开始关闭动画
        aboutModal.classList.remove('active');
        
        // 移除背景模糊
        if (mainContent) {
            mainContent.style.filter = '';
        }
        
        // 等待动画完成后隐藏模态框
        setTimeout(() => {
            aboutModal.style.visibility = 'hidden';
            // 恢复背景滚动
            document.body.style.overflow = '';
        }, 600); // 从400ms改为600ms，与CSS中的动画时长匹配
    }
    
    // 为所有"关于"链接添加点击事件
    aboutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            openAboutModal();
        });
    });
    
    // 关闭按钮事件
    closeAboutModal.addEventListener('click', closeModal);
    
    // 点击模态框背景关闭
    aboutModal.addEventListener('click', function(e) {
        if (e.target === aboutModal) {
            closeModal();
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && aboutModal.classList.contains('active')) {
            closeModal();
        }
    });

    // 选项卡切换功能
    const aboutTabs = document.querySelectorAll('.about-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // 初始显示"关于"选项卡内容 (假设默认是关于)
    const initialActiveTab = document.querySelector('.about-tab.active');
    const initialTabContentId = initialActiveTab ? initialActiveTab.getAttribute('data-tab') + '-content' : 'about-content';
    tabContents.forEach(content => {
        content.style.display = content.id === initialTabContentId ? 'block' : 'none';
    });
    if (!initialActiveTab && document.querySelector('.about-tab[data-tab="about"]')) {
        document.querySelector('.about-tab[data-tab="about"]').classList.add('active'); // 确保至少有一个激活
    }

    // 为所有选项卡添加点击事件
    aboutTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有选项卡的激活状态
            aboutTabs.forEach(t => t.classList.remove('active'));
            // 添加当前选项卡的激活状态
            this.classList.add('active');
            // 获取目标内容区域
            const targetTab = this.getAttribute('data-tab');
            // 隐藏所有内容
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            // 显示当前选项卡对应的内容
            const targetContent = document.getElementById(`${targetTab}-content`);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
        });
    });

    // --- 高斯模糊控制重构 ---
    const mainBlurToggle = document.getElementById('toggleBlurButton');
    const modalBlurButton = document.getElementById('blurEffectButton');

    // 函数：更新所有模糊控制按钮的外观
    function updateBlurControls() {
        const isBlurDisabled = body.classList.contains('no-blur');
        const currentLang = localStorage.getItem('preferredLanguage') || 'zh'; // 获取当前语言

        // 定义按钮文本的翻译
        const blurButtonTexts = {
            en: { enabled: 'Blur Enabled', disabled: 'Blur Disabled' },
            zh: { enabled: '模糊已启用', disabled: '模糊已禁用' }
        };
        const texts = blurButtonTexts[currentLang] || blurButtonTexts['zh'];

        // 更新主界面开关
        if (mainBlurToggle) {
            if (isBlurDisabled) {
                mainBlurToggle.classList.remove('active');
            } else {
                mainBlurToggle.classList.add('active');
            }
        }

        // 更新模态框按钮
        if (modalBlurButton) {
            if (isBlurDisabled) {
                modalBlurButton.textContent = texts.disabled; // 使用翻译后的文本
                modalBlurButton.classList.remove('blur-enabled');
                modalBlurButton.classList.add('blur-disabled');
            } else {
                modalBlurButton.textContent = texts.enabled; // 使用翻译后的文本
                modalBlurButton.classList.remove('blur-disabled');
                modalBlurButton.classList.add('blur-enabled');
            }
        }
    }

    // 函数：切换模糊效果的核心逻辑
    function toggleBlurEffect() {
        body.classList.toggle('no-blur');
        const isBlurDisabled = body.classList.contains('no-blur');
        localStorage.setItem('blurDisabled', isBlurDisabled);
        updateBlurControls();

        // 定义 Toast 消息的翻译
        const currentLang = localStorage.getItem('preferredLanguage') || 'zh';
        const toastMessages = {
            en: { enabled: 'Blur effect enabled', disabled: 'Blur effect disabled' },
            zh: { enabled: '高斯模糊已开启', disabled: '高斯模糊已关闭' }
        };
        const messages = toastMessages[currentLang] || toastMessages['zh'];

        if (isBlurDisabled) {
            showToast(messages.disabled, "error"); // 使用翻译后的消息
        } else {
            showToast(messages.enabled, "success"); // 使用翻译后的消息
        }
    }

    // 初始化：页面加载时根据 localStorage 设置初始状态并更新按钮
    if (localStorage.getItem('blurDisabled') === 'true') {
        body.classList.add('no-blur');
    } else {
        body.classList.remove('no-blur'); // 确保没有 no-blur 类
    }
    updateBlurControls(); // 设置初始按钮状态

    // 为主界面开关添加事件监听器
    if (mainBlurToggle) {
        mainBlurToggle.addEventListener('click', function() {
            // 添加动画效果 (如果需要)
            this.classList.add('toggling');
            setTimeout(() => {
                this.classList.remove('toggling');
            }, 300);
            // 调用核心切换函数
            toggleBlurEffect();
        });
    }

    // 为模态框按钮添加事件监听器
    if (modalBlurButton) {
        modalBlurButton.addEventListener('click', toggleBlurEffect); // 直接调用核心切换函数
    }
    // --- 结束：高斯模糊控制重构 ---

    // 在文档加载前预加载关键图片
    const preloadBackgroundImage = new Image();
    preloadBackgroundImage.src = '1.png';
    
    // 当图片加载完成后应用到背景
    preloadBackgroundImage.onload = function() {
        const coverElement = document.querySelector('.index-cover');
        if (coverElement) {
            // 使用已加载的图片作为背景
            coverElement.style.backgroundImage = `url('${preloadBackgroundImage.src}')`;
            
            // 添加加载完成的类，可以用于触发动画或其他效果
            coverElement.classList.add('background-loaded');
        }
    };

    // 为特色区域按钮添加随机打开文章功能
    const featuredButton = document.querySelector('.featured-button');
    
    if (featuredButton) {
        featuredButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 只选择前三篇文章（post1, post2, post3）
            const firstThreePosts = document.querySelectorAll('.blog-post:nth-child(-n+3) .post-title a');
            
            if (firstThreePosts.length > 0) {
                // 随机选择一篇文章
                const randomIndex = Math.floor(Math.random() * firstThreePosts.length);
                const randomArticleLink = firstThreePosts[randomIndex];
                
                // 模拟点击文章链接，利用现有的事件处理逻辑
                randomArticleLink.click();
                
                // 控制台输出信息
                console.log(`随机打开文章: ${randomArticleLink.textContent}`);
            } else {
                console.warn('没有找到前三篇文章');
            }
        });
    }

    // --- 新增：分页逻辑 ---
    const postsContainer = document.querySelector('.blog-posts');
    const paginationContainer = document.querySelector('.pagination');
    const posts = postsContainer ? Array.from(postsContainer.querySelectorAll('.blog-post')) : [];
    const postsPerPage = 6; // 每页显示的文章数量
    let currentPage = 1;

    if (postsContainer && paginationContainer && posts.length > 0) {
        const totalPosts = posts.length;
        const totalPages = Math.ceil(totalPosts / postsPerPage);

        function showPage(page) {
            currentPage = page;
            const startIndex = (page - 1) * postsPerPage;
            const endIndex = startIndex + postsPerPage;

            // 隐藏所有文章
            posts.forEach(post => post.style.display = 'none');

            // 显示当前页的文章
            posts.slice(startIndex, endIndex).forEach(post => post.style.display = ''); // 恢复默认 display

            renderPagination(); // 重新渲染分页链接以更新 active 状态
            window.scrollTo(0, postsContainer.offsetTop - 80); // 点击分页后滚动到文章列表顶部附近
        }

        function renderPagination() {
            paginationContainer.innerHTML = ''; // 清空旧链接

            if (totalPages <= 1) return; // 如果只有一页或没有文章，则不显示分页

            // 上一页按钮
            const prevButton = document.createElement('a');
            prevButton.href = '#';
            prevButton.innerHTML = '&laquo; 上一页';
            prevButton.classList.add('page-prev');
            if (currentPage === 1) {
                prevButton.classList.add('disabled');
            } else {
                prevButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (currentPage > 1) {
                        showPage(currentPage - 1);
                    }
                });
            }
            paginationContainer.appendChild(prevButton);

            // 页码按钮
            for (let i = 1; i <= totalPages; i++) {
                const pageButton = document.createElement('a');
                pageButton.href = '#';
                pageButton.textContent = i;
                pageButton.classList.add('page-number');
                if (i === currentPage) {
                    pageButton.classList.add('active');
                }
                pageButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPage(i);
                });
                paginationContainer.appendChild(pageButton);
            }

            // 下一页按钮
            const nextButton = document.createElement('a');
            nextButton.href = '#';
            nextButton.innerHTML = '下一页 &raquo;';
            nextButton.classList.add('page-next');
            if (currentPage === totalPages) {
                nextButton.classList.add('disabled');
            } else {
                nextButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) {
                        showPage(currentPage + 1);
                    }
                });
            }
            paginationContainer.appendChild(nextButton);
        }

        // 初始显示第一页
        showPage(1);

    } else {
        if (!postsContainer) console.error("Pagination Error: '.blog-posts' container not found.");
        if (!paginationContainer) console.error("Pagination Error: '.pagination' container not found.");
        if (posts.length === 0 && postsContainer) console.warn("Pagination Info: No '.blog-post' elements found inside '.blog-posts'.");
    }
    // --- 结束：分页逻辑 ---

    // --- 新增：返回锁屏按钮逻辑 ---
    if (backToLock && coverElement) {
        backToLock.addEventListener('click', function() {
            console.log('返回锁屏');

            // 1. 显示锁屏封面 (如果它被隐藏了)
            coverElement.style.display = 'block'; // 或者 'flex', 取决于你的布局
            // 可以添加动画类来平滑过渡
            requestAnimationFrame(() => {
                coverElement.classList.add('active'); // 假设 'active' 类控制显示动画
                coverElement.style.opacity = '1'; // 渐显
            });

            // 2. 隐藏主要内容区域（但保留 mainContent 容器本身及其内部的常驻元素）
            //    只隐藏需要隐藏的部分，例如文章列表和分页
            if (postsContainer) {
                postsContainer.style.display = 'none';
            }
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
            }
            // 如果有其他在进入内容区时显示，返回锁屏时需要隐藏的元素，也在这里处理

            // 3. 移除可能表示内容区可见的 body 类名 (如果存在)
            // document.body.classList.remove('content-visible'); // 示例类名

            // 4. 添加表示锁屏状态的 body 类名 (可选, 用于样式控制)
            document.body.classList.add('lock-screen-active');
            document.body.classList.remove('content-entered'); // 移除表示已进入内容的类

            // 5. 隐藏返回锁屏按钮本身
            backToLock.style.display = 'none'; // 或者添加隐藏类

            // 6. 确保 #mainContent 容器本身是可见的 (如果它之前被隐藏了)
            //    这很重要，因为作者卡片可能在 #mainContent 内但不在 .blog-posts 内
            if (mainContent) {
                mainContent.style.display = ''; // 清除内联样式，让CSS控制
                mainContent.classList.remove('hidden'); // 移除可能导致隐藏的类
                // 可能需要移除导致其隐藏的特定样式或类
            }

            // 7. 确保作者卡片等常驻 UI 可见
            const authorCard = document.querySelector('.author-card, .profile-card, .user-card, .personal-info');
            if(authorCard) {
                console.log('找到作者卡片，确保其可见');
                authorCard.style.display = 'block'; // 明确设置为显示
                authorCard.classList.remove('hidden'); // 移除可能导致隐藏的类
                authorCard.style.visibility = 'visible'; // 确保可见性
                authorCard.style.opacity = '1'; // 确保不透明度
            } else {
                console.warn('无法找到作者卡片，请检查选择器');
            }
            
            // 8. 查找作者卡片的所有可能父容器，确保它们可见
            const possibleParents = document.querySelectorAll('.user-info-container, .profile-container, .sidebar');
            possibleParents.forEach(parent => {
                if(parent) {
                    parent.style.display = 'block';
                    parent.classList.remove('hidden');
                    parent.style.visibility = 'visible';
                    parent.style.opacity = '1';
                }
            });

            // 对其他需要保持可见的元素执行类似操作 (如模糊开关)
            const blurToggle = document.getElementById('toggleBlurButton');
            if(blurToggle) {
                blurToggle.style.display = 'flex'; // 根据实际样式选择合适的display值
                blurToggle.classList.remove('hidden');
                blurToggle.style.visibility = 'visible';
                blurToggle.style.opacity = '1';
            }
        });
    } else {
        if (!backToLock) console.error("返回锁屏按钮 #backToLock 未找到");
        if (!coverElement) console.error("锁屏封面元素 .index-cover 未找到");
    }
    // --- 结束：返回锁屏按钮逻辑 ---

    // --- 语言设置逻辑 (适配自定义下拉菜单) ---
    const languageSelectorContainer = document.getElementById('languageSelectorContainer');
    const languageDisplay = document.getElementById('languageDisplay');
    const languageDisplayText = languageDisplay ? languageDisplay.querySelector('span') : null;
    const languageOptions = document.getElementById('languageOptions');

    // 函数：加载语言偏好并设置显示文本
    function loadLanguagePreference() {
        const savedLang = localStorage.getItem('preferredLanguage') || 'zh'; // 默认中文
        let selectedOptionText = '选择语言'; // 默认文本

        if (languageOptions) {
            const options = languageOptions.querySelectorAll('li');
            options.forEach(option => {
                option.classList.remove('selected'); // 清除旧的选择状态
                if (option.getAttribute('data-value') === savedLang) {
                    selectedOptionText = option.textContent;
                    option.classList.add('selected'); // 标记当前选项
                }
            });
        }

        if (languageDisplayText) {
            languageDisplayText.textContent = selectedOptionText;
        }
        // 页面加载时应用一次语言
        applyLanguageChange(savedLang);
    }

    // 函数：保存语言偏好 (保持不变)
    function saveLanguagePreference(lang) {
        localStorage.setItem('preferredLanguage', lang);
    }

    // 函数：应用语言更改 (保持不变, 仍需实现核心逻辑)
    function applyLanguageChange(lang) {
        console.log(`应用语言更改为: ${lang}`);
        document.documentElement.lang = lang;
        // ... (核心翻译逻辑占位符) ...
        updateBlurControls(); // 确保模糊按钮文本更新
    }

    // 自定义下拉菜单交互逻辑
    if (languageSelectorContainer && languageDisplay && languageOptions) {
        // 点击显示区域，切换选项列表的显示/隐藏
        languageDisplay.addEventListener('click', (event) => {
            event.stopPropagation(); // 防止触发全局点击事件
            languageSelectorContainer.classList.toggle('open');
            // 添加日志确认类切换
            console.log('Toggled .open class. Container classes:', languageSelectorContainer.className);
        });

        // 点击选项
        languageOptions.addEventListener('click', (event) => {
            if (event.target.tagName === 'LI') {
                const selectedValue = event.target.getAttribute('data-value');
                const selectedText = event.target.textContent;
                if (languageDisplayText) {
                    languageDisplayText.textContent = selectedText;
                }
                languageOptions.querySelectorAll('li').forEach(opt => opt.classList.remove('selected'));
                event.target.classList.add('selected');
                languageSelectorContainer.classList.remove('open');
                saveLanguagePreference(selectedValue);
                applyLanguageChange(selectedValue);
                showToast(`语言已切换为 ${selectedText}`, 'success');
            }
        });

        // 点击页面其他地方关闭下拉菜单
        document.addEventListener('click', (event) => {
            // 确保点击的目标不是显示区域本身或其子元素（如图标）
            if (!languageDisplay.contains(event.target) && !languageOptions.contains(event.target) && languageSelectorContainer.classList.contains('open')) {
                 console.log('Clicked outside, closing dropdown.');
                 languageSelectorContainer.classList.remove('open');
            }
        });
    } else {
        console.warn('自定义语言选择器元素未完全找到');
    }
    // --- 结束：语言设置逻辑 ---

    // 在 openArticleDetail 函数中添加一个更强大的图片修复函数
    function handleImageError(articlePath, img) {
        console.log('处理图片加载错误:', img.src);
        
        // 提取文章基础路径
        const pathParts = articlePath.split('/');
        pathParts.pop(); // 移除文件名
        const basePath = pathParts.join('/');
        
        // 尝试不同的路径组合
        const originalSrc = img.getAttribute('src');
        const possiblePaths = [
            // 原始路径
            originalSrc,
            // 相对于文章路径
            `${basePath}/${originalSrc}`,
            // 移除开头的 ./ 
            originalSrc.replace(/^\.\//, `${basePath}/`),
            // 相对于网站根目录
            `/${originalSrc}`,
            // 相对于images目录
            `/images/${originalSrc.split('/').pop()}`,
            // 相对于posts/images目录
            `/posts/images/${originalSrc.split('/').pop()}`
        ];
        
        // 轮流尝试所有可能的路径
        function tryNextPath(index) {
            if (index >= possiblePaths.length) {
                // 所有路径都失败，显示替代图像
                img.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 500 300%22%3E%3Crect fill%3D%22%23f8f8f8%22 width%3D%22500%22 height%3D%22300%22%2F%3E%3Ctext fill%3D%22%23aaa%22 font-family%3D%22Arial%2C sans-serif%22 font-size%3D%2220%22 x%3D%22250%22 y%3D%22150%22 text-anchor%3D%22middle%22 dominant-baseline%3D%22middle%22%3E图片加载失败%3C%2Ftext%3E%3C%2Fsvg%3E';
                img.classList.add('image-load-failed');
                return;
            }
            
            const newSrc = possiblePaths[index];
            console.log(`尝试加载图片路径 (${index+1}/${possiblePaths.length}):`, newSrc);
            
            // 使用Image对象预加载图片
            const testImg = new Image();
            testImg.onload = function() {
                // 成功加载，更新原始图片
                img.src = newSrc;
                img.classList.remove('image-loading');
                img.classList.add('image-loaded');
                console.log('图片加载成功:', newSrc);
            };
            testImg.onerror = function() {
                // 失败，尝试下一个路径
                setTimeout(() => tryNextPath(index + 1), 50);
            };
            testImg.src = newSrc;
        }
        
        // 标记图片为加载中状态
        img.classList.add('image-loading');
        
        // 开始尝试第一个路径
        tryNextPath(0);
    }

    // 修改 fixArticleImages 函数，删除自定义灯箱代码，改用Fancybox
    function fixArticleImages(articlePath, articleContentElement) {
        console.log('开始修复文章图片路径...');
        
        // 添加基础图片样式（保留样式但移除灯箱相关样式）
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* 基础图片样式 */
            #articleContent img, .article-detail-content img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 15px auto;
                border-radius: 16px;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1)
            }

            #articleContent img:hover, .article-detail-content img:hover {
                transform: scale(0.90);
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
        `;
        document.head.appendChild(styleElement);
        
        // 处理所有图片
        const images = articleContentElement.querySelectorAll('img');
        console.log(`找到 ${images.length} 张图片需要处理`);
        
        if (images.length === 0) {
            console.log('文章中没有找到图片');
            return;
        }
        
        images.forEach((img) => {
            // 保存原始src作为data属性
            const originalSrc = img.getAttribute('src');
            if (!originalSrc) return;
            
            img.setAttribute('data-original-src', originalSrc);
            
            // 修复图片后使用Fancybox
            setTimeout(() => {
                if (!img.complete || img.naturalWidth === 0) {
                    handleImageError(articlePath, img);
                } else {
                    console.log('图片已正常加载:', originalSrc);
                    img.classList.add('image-loaded');
                }
                
                // 将图片包装在链接中，以便Fancybox可以使用
                if (!img.parentNode.tagName || img.parentNode.tagName !== 'A') {
                    const imgWrapper = document.createElement('a');
                    imgWrapper.href = img.src; // 使用当前src作为链接
                    imgWrapper.setAttribute('data-fancybox', 'article-gallery');
                    imgWrapper.setAttribute('data-caption', img.alt || '图片');
                    
                    // 将图片从当前位置移动到链接内
                    img.parentNode.insertBefore(imgWrapper, img);
                    imgWrapper.appendChild(img);
                }
            }, 100);
            
            // 添加错误处理
            img.onerror = function() {
                handleImageError(articlePath, this);
            };
        });
        
        // 同样处理背景图片
        const elementsWithBgImage = articleContentElement.querySelectorAll('[style*="background-image"]');
        console.log(`找到 ${elementsWithBgImage.length} 个背景图片元素`);
        
        elementsWithBgImage.forEach((el) => {
            const style = el.getAttribute('style');
            if (!style) return;
            
            const matches = style.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
            if (matches && matches[1]) {
                const bgUrl = matches[1];
                
                // 将相对路径转换为绝对路径
                if (!bgUrl.startsWith('http') && !bgUrl.startsWith('data:')) {
                    const pathParts = articlePath.split('/');
                    pathParts.pop();
                    const basePath = pathParts.join('/');
                    
                    // 创建一系列可能的路径
                    const possibleBgPaths = [
                        bgUrl,
                        `${basePath}/${bgUrl}`,
                        `/${bgUrl}`,
                        `/images/${bgUrl.split('/').pop()}`
                    ];
                    
                    // 存储原始背景URL
                    el.setAttribute('data-original-bg', bgUrl);
                    
                    // 尝试预加载第一个路径
                    const testImg = new Image();
                    testImg.onload = function() {
                        // 成功加载，更新样式
                        const newStyle = style.replace(
                            /background-image:\s*url\(['"]?([^'")]+)['"]?\)/i,
                            `background-image: url("${possibleBgPaths[0]}")`
                        );
                        el.setAttribute('style', newStyle);
                    };
                    testImg.onerror = function() {
                        // 首选路径失败，使用常见路径
                        const newStyle = style.replace(
                            /background-image:\s*url\(['"]?([^'")]+)['"]?\)/i,
                            `background-image: url("/images/${bgUrl.split('/').pop()}")`
                        );
                        el.setAttribute('style', newStyle);
                    };
                    testImg.src = possibleBgPaths[0];
                }
            }
        });
        
        // 初始化Fancybox
        if (typeof Fancybox !== 'undefined') {
            Fancybox.bind('[data-fancybox="article-gallery"]', {
                // Fancybox配置选项
                Image: {
                    zoom: true,
                },
                Thumbs: {
                    autoStart: true,
                }
            });
        } else {
            console.warn('Fancybox库未加载，无法初始化图片灯箱功能');
        }
    }

    // --- 添加 Lenis 滚动加速度效果 ---
    // 创建 Lenis 滚动实例并添加加速度效果
    const mainLenis = new Lenis({
        wrapper: document.querySelector('.main-content'), // 主内容滚动容器
        duration: 1.2, // 增加持续时间以获得更明显的加速效果
        easing: (t) => {
            // 自定义加速度曲线：开始慢，然后迅速加速
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        },
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.5, // 增加滚轮乘数
        lerp: 0.08, // 线性插值系数（0.08是一个较快的值）
        infinite: false
    });
    
    // 文章详情页的 Lenis 实例
    const articleLenis = new Lenis({
        wrapper: document.querySelector('.article-detail-page'),
        duration: 1.2,
        easing: (t) => {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        },
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.5,
        lerp: 0.08,
        infinite: false
    });
    
    // 文章目录的 Lenis 实例
    const articleTocLenis = new Lenis({
        wrapper: document.querySelector('.article-toc'),
        duration: 1.0, // 目录区域可以略快一些
        easing: (t) => {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        },
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.3,
        lerp: 0.07,
        infinite: false
    });
    
    // 滚动时触发加速度效果的回调函数
    mainLenis.on('scroll', (e) => {
        // 可以在这里添加基于滚动的动画效果
        // 例如滚动速度越快，某些元素越模糊等
    });
    
    // RAF (requestAnimationFrame) 循环
    function raf(time) {
        mainLenis.raf(time);
        articleLenis.raf(time);
        articleTocLenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    
    // 窗口大小改变时重新计算
    window.addEventListener('resize', () => {
        mainLenis.resize();
        articleLenis.resize();
        articleTocLenis.resize();
    });
    
    // 停止滚动时的回弹效果
    function handleScrollStop() {
        mainLenis.scrollTo('current', { 
            duration: 0.8, 
            easing: (t) => Math.sin((t * Math.PI) / 2) // 回弹效果
        });
    }
    
    let scrollTimeout;
    window.addEventListener('wheel', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScrollStop, 150);
    }, { passive: true });
    // --- 结束：Lenis 滚动加速度效果 ---
});

// 根据现有代码判断文章打开函数可能是这样的
// 如果您的实际函数名或参数不同，请相应调整
function openArticle(id, title) {
    // 获取文章详情页元素
    const articleDetailPage = document.querySelector('.article-detail-page');
    const articleTitle = document.querySelector('.article-detail-page header h2');
    const articleContent = document.querySelector('.article-detail-content');
    
    if (articleDetailPage && articleTitle && articleContent) {
        // 设置文章标题
        articleTitle.textContent = title;
        
        // 显示加载状态
        articleContent.innerHTML = '<div class="loading-text">正在加载文章内容...</div>';
        
        // 添加文章开启状态类
        document.body.classList.add('article-open');
        
        // 设置文章详情页为可见
        articleDetailPage.style.right = '0';
        
        // 这里假设您有一个加载文章内容的函数
        // 如果实际情况不同，请相应调整
        loadArticleContent(id)
            .then(content => {
                articleContent.innerHTML = content;
            })
            .catch(error => {
                articleContent.innerHTML = `
                    <div class="error-message">
                        <h3>加载失败</h3>
                        <p>无法加载文章内容，请稍后再试。</p>
                        <p>错误信息: ${error.message}</p>
                    </div>
                `;
            });
    }
}

// 加载文章内容的函数（根据您的实际实现调整）
function loadArticleContent(id) {
    // 这里应该是您实际获取文章内容的逻辑
    // 例如，从服务器获取或从本地数据加载
    return new Promise((resolve, reject) => {
        // 模拟加载延迟
        setTimeout(() => {
            // 如果有现成的文章内容加载方法，应该调用它
            // 这里仅作为示例
            const content = `
                <h1>随机文章 #${id}</h1>
                <p>这是随机选择的文章内容。在实际应用中，您应该替换为真实内容。</p>
                <p>本文内容丰富多彩，包含了许多有趣的主题和精彩的观点。</p>
                <p>希望您喜欢这篇随机选择的文章!</p>
            `;
            resolve(content);
        }, 800);
    });
} 

// --- 确保 showToast 函数存在 ---
function showToast(message, type = 'default') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('Toast container not found!');
        return;
    }

    // 1. 创建 Toast 元素
    const toast = document.createElement('div');
    toast.className = 'toast-notification'; // 基础类
    if (type === 'success') toast.classList.add('toast-success');
    if (type === 'error') toast.classList.add('toast-error');
    toast.textContent = message;
    toast.style.opacity = '0'; // 初始隐藏

    // 2. 添加到容器
    toastContainer.appendChild(toast);

    // 3. 计算新 Toast 高度
    const shiftAmount = toast.offsetHeight - 30; // 加上间距

    // 4. 向上移动现有的 Toast
    const existingToasts = Array.from(toastContainer.children).slice(0, -1);
    existingToasts.forEach(existingToast => {
        let currentTranslateY = 0;
        const currentTransform = existingToast.style.transform;
        if (currentTransform && currentTransform.includes('translateY')) {
            const match = currentTransform.match(/translateY\(([-.\d]+)px\)/);
            if (match && match[1]) {
                currentTranslateY = parseFloat(match[1]);
            }
        }
        const newTranslateY = currentTranslateY - shiftAmount;
        existingToast.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
        existingToast.style.transform = `translateY(${newTranslateY}px)`;

        // 清理 transition
        function cleanupShiftTransition(event) {
            if (event.propertyName === 'transform' && event.target === existingToast) {
                existingToast.style.transition = '';
                existingToast.removeEventListener('transitionend', cleanupShiftTransition);
            }
        }
        existingToast.addEventListener('transitionend', cleanupShiftTransition);
    });

    // 5. 显示新的 Toast
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
             toast.style.opacity = ''; // 移除内联 opacity
             toast.classList.add('show'); // 触发 CSS 动画
        });
    });

    // 6. 自动隐藏
    const displayDuration = 2500;
    const hideTimeoutId = setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        let transitionEnded = false;
        function handleHideTransitionEnd(event) {
            if (!transitionEnded && event.target === toast && (event.propertyName === 'transform' || event.propertyName === 'opacity')) {
                transitionEnded = true;
                toast.removeEventListener('transitionend', handleHideTransitionEnd);
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }
        }
        toast.addEventListener('transitionend', handleHideTransitionEnd);
        // 安全移除
        setTimeout(() => {
            if (!transitionEnded && toast.parentNode === toastContainer) {
                toast.removeEventListener('transitionend', handleHideTransitionEnd);
                toastContainer.removeChild(toast);
            }
        }, 700); // 略长于 CSS 隐藏动画时间
    }, displayDuration);
    toast.dataset.hideTimeoutId = hideTimeoutId; // 存储 timeout ID 以便需要时清除
}
// --- 结束 showToast 函数 --- 