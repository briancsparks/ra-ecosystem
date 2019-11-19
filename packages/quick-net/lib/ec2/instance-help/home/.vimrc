" execute pathogen#infect()

"
"
" Use: ':so %' to reload this .vimrc file
"
"

:let mapleader = ","

:set nocompatible
:set hidden
:set showcmd
:set nu
:syntax on
:set ruler
:set clipboard=unnamed
":set autoread
highlight StatusLine ctermfg=blue ctermbg=yellow

filetype plugin indent on

" Show error whitespace
highlight ErrorWhitespace ctermbg=red guibg=red
match ErrorWhitespace /\s\+$/
autocmd BufWinEnter * match ErrorWhitespace /\s\+$/
autocmd InsertEnter * match ErrorWhitespace /\s\+\%#\@<!$/
autocmd InsertLeave * match ErrorWhitespace /\s\+$/
autocmd BufWinLeave * call clearmatches()
autocmd ColorScheme * highlight ErrorWhitespace ctermbg=red guibg=red

":set background=dark
"let g:solarized_termcolors=256
"colorscheme solarized

" Whitespace
:set nowrap
:set tabstop=2
:set shiftwidth=2
:set expandtab
:set smartindent
:set backspace=indent,eol,start

" Searching
:set hlsearch
:set incsearch
:set ignorecase
:set smartcase

:set noswapfile

:set path=./**

"
" --------------- key mappings ----------------
"

" Next / Previous tab
:map <F7> :tabp<CR>
:map <F8> :tabn<CR>

" Open new tab
:map <C-t> <esc>:tabe<CR>,t

" Open file from the same dir
:map <Leader>e :e <C-R>=expand("%:p:h") . '/'<CR>

" Clear search
nmap <silent> ,. :nohlsearch<CR>

:color desert
" :color delek

let g:ackprg="/usr/local/bin/ack -H --nocolor --column"

"
" ------------------------------------- // to search while in visual mode -------------------------------
"
vnoremap // y/<C-R>"<CR>


" Do not have to use :set paste ever again!
if &term =~ "xterm.*"
    let &t_ti = &t_ti . "\e[?2004h"
    let &t_te = "\e[?2004l" . &t_te
    function! XTermPasteBegin(ret)
        set pastetoggle=<Esc>[201~
        set paste
        return a:ret
    endfunction
    map <expr> <Esc>[200~ XTermPasteBegin("i")
    imap <expr> <Esc>[200~ XTermPasteBegin("")
    vmap <expr> <Esc>[200~ XTermPasteBegin("c")
    cmap <Esc>[200~ <nop>
    cmap <Esc>[201~ <nop>
endif


