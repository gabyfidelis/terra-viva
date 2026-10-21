// ======================================================
// TERRA VIVA
// Caderno de Campo Digital para a Agricultura Familiar
// ======================================================

"use strict";

const TerraViva = (() => {

    const CHAVES = {
        usuarios: "terraViva_usuarios",
        atividades: "terraViva_atividades",
        historico: "terraViva_historico",
        sessao: "terraViva_sessao"
    };

    let usuarioAtual = null;

    // --------------------------------------------------
    // 1. ARMAZENAMENTO LOCAL
    // --------------------------------------------------

    function carregar(chave, padrao = []) {
        try {
            const dados = localStorage.getItem(chave);
            return dados ? JSON.parse(dados) : padrao;
        } catch (erro) {
            console.error("Erro ao carregar dados:", erro);
            return padrao;
        }
    }

    function salvar(chave, dados) {
        try {
            localStorage.setItem(chave, JSON.stringify(dados));
            return true;
        } catch (erro) {
            console.error("Erro ao salvar dados:", erro);

            alert(
                "Não foi possível salvar os dados. " +
                "Verifique o espaço disponível no navegador."
            );

            return false;
        }
    }

    function identificador() {
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        return Date.now().toString(36) +
            Math.random().toString(36).substring(2);
    }

    function dataAtual() {
        const agora = new Date();

        return [
            agora.getFullYear(),
            String(agora.getMonth() + 1).padStart(2, "0"),
            String(agora.getDate()).padStart(2, "0")
        ].join("-");
    }

    function dataHoraAtual() {
        return new Date().toLocaleString("pt-BR");
    }

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    // --------------------------------------------------
    // 2. DADOS INICIAIS
    // --------------------------------------------------

    function inicializar() {
        if (!localStorage.getItem(CHAVES.usuarios)) {
            salvar(CHAVES.usuarios, []);
        }

        if (!localStorage.getItem(CHAVES.atividades)) {
            salvar(CHAVES.atividades, []);
        }

        if (!localStorage.getItem(CHAVES.historico)) {
            salvar(CHAVES.historico, []);
        }

        console.log("Terra Viva iniciado com sucesso!");
    }

    // --------------------------------------------------
    // 3. USUÁRIO E SESSÃO
    // --------------------------------------------------

    function usuarios() {
        return carregar(CHAVES.usuarios);
    }

    function atividades() {
        return carregar(CHAVES.atividades);
    }

    function historico() {
        return carregar(CHAVES.historico);
    }

    function salvarUsuarios(lista) {
        return salvar(CHAVES.usuarios, lista);
    }

    function salvarAtividades(lista) {
        return salvar(CHAVES.atividades, lista);
    }

    function salvarHistorico(lista) {
        return salvar(CHAVES.historico, lista);
    }

    function registrarHistorico(acao, registroId, detalhes) {
        const registros = historico();

        registros.push({
            id: identificador(),
            acao: acao,
            registroId: registroId,
            responsavel: usuarioAtual
                ? usuarioAtual.id
                : null,
            data: dataHoraAtual(),
            detalhes: detalhes
        });

        return salvarHistorico(registros);
    }

    function entrar(email, senha) {
        const emailNormalizado = normalizar(email);

        const usuario = usuarios().find(item =>
            normalizar(item.email) === emailNormalizado &&
            item.senha === senha &&
            item.status === "aprovado"
        );

        if (!usuario) {
            alert(
                "Não foi possível entrar. " +
                "Confira seus dados ou verifique " +
                "se seu cadastro foi aprovado."
            );

            return false;
        }

        usuarioAtual = usuario;

        salvar(CHAVES.sessao, {
            usuarioId: usuario.id
        });

        alert(
            "Bem-vindo(a) ao Terra Viva, " +
            usuario.nome + "!"
        );

        atualizarInterface();

        return true;
    }

    function sair() {
        usuarioAtual = null;

        localStorage.removeItem(CHAVES.sessao);

        atualizarInterface();

        alert("Você saiu da demonstração do Terra Viva.");
    }

    function restaurarSessao() {
        const sessao = carregar(CHAVES.sessao, null);

        if (!sessao || !sessao.usuarioId) {
            return;
        }

        const usuario = usuarios().find(item =>
            item.id === sessao.usuarioId &&
            item.status === "aprovado"
        );

        if (usuario) {
            usuarioAtual = usuario;
        } else {
            localStorage.removeItem(CHAVES.sessao);
        }
    }

    function exigirLogin() {
        if (!usuarioAtual) {
            alert("Entre na sua conta para continuar.");
            abrirLogin();
            return false;
        }

        return true;
    }

    function exigirDirecao() {
        if (!exigirLogin()) {
            return false;
        }

        if (usuarioAtual.tipo !== "direcao") {
            alert(
                "Esta função é exclusiva da direção."
            );

            return false;
        }

        return true;
    }

    // --------------------------------------------------
    // 4. CADASTRO DE AGRICULTORES
    // --------------------------------------------------

    function cadastrar(dados) {
        const lista = usuarios();

        const emailExiste = lista.some(item =>
            normalizar(item.email) === normalizar(dados.email)
        );

        if (emailExiste) {
            alert("Este e-mail já possui um cadastro.");
            return false;
        }

        const novoUsuario = {
            id: identificador(),
            nome: dados.nome.trim(),
            email: dados.email.trim(),
            senha: dados.senha,
            comunidade: dados.comunidade.trim(),
            tipo: "agricultor",
            status: "pendente",
            criadoEm: dataHoraAtual()
        };

        lista.push(novoUsuario);

        if (!salvarUsuarios(lista)) {
            return false;
        }

        registrarHistorico(
            "Solicitação de cadastro",
            novoUsuario.id,
            "Cadastro aguardando aprovação."
        );

        alert(
            "Cadastro solicitado com sucesso!\n\n" +
            "A direção precisa aprovar seu cadastro " +
            "antes de você acessar o caderno."
        );

        return true;
    }

    // --------------------------------------------------
    // 5. REGISTRO DE ATIVIDADES AGRÍCOLAS
    // --------------------------------------------------

    function registrarAtividade(dados) {
        if (!exigirLogin()) {
            return false;
        }

        const lista = atividades();

        const atividade = {
            id: identificador(),
            agricultorId: usuarioAtual.id,
            titulo: dados.titulo.trim(),
            tipo: dados.tipo,
            data: dados.data,
            local: dados.local.trim(),
            descricao: dados.descricao.trim(),
            producao: dados.producao.trim(),
            criadoEm: dataHoraAtual(),
            atualizadoEm: dataHoraAtual()
        };

        lista.push(atividade);

        if (!salvarAtividades(lista)) {
            return false;
        }

        registrarHistorico(
            "Criação de atividade",
            atividade.id,
            "Registro criado pelo agricultor."
        );

        alert("Atividade registrada com sucesso!");

        return true;
    }

    // O agricultor recebe somente os registros
    // associados ao seu próprio identificador.

    function minhasAtividades() {
        if (!exigirLogin()) {
            return [];
        }

        return atividades().filter(item =>
            item.agricultorId === usuarioAtual.id
        );
    }

    // --------------------------------------------------
    // 6. CORREÇÃO DE REGISTROS
    // --------------------------------------------------

    function corrigirAtividade(id, novosDados) {
        if (!exigirDirecao()) {
            return false;
        }

        const lista = atividades();

        const indice = lista.findIndex(item =>
            item.id === id
        );

        if (indice === -1) {
            alert("Registro não encontrado.");
            return false;
        }

        const anterior = { ...lista[indice] };

        lista[indice] = {
            ...lista[indice],
            titulo: novosDados.titulo.trim(),
            tipo: novosDados.tipo,
            data: novosDados.data,
            local: novosDados.local.trim(),
            descricao: novosDados.descricao.trim(),
            producao: novosDados.producao.trim(),
            atualizadoEm: dataHoraAtual(),
            corrigidoPor: usuarioAtual.id
        };

        if (!salvarAtividades(lista)) {
            return false;
        }

        registrarHistorico(
            "Correção de atividade",
            id,
            JSON.stringify({
                antes: anterior,
                depois: lista[indice]
            })
        );

        alert(
            "Registro corrigido. " +
            "A alteração foi registrada no histórico."
        );

        return true;
    }

    // --------------------------------------------------
    // 7. APROVAÇÃO DE CADASTROS
    // --------------------------------------------------

    function aprovarCadastro(id) {
        if (!exigirDirecao()) {
            return false;
        }

        const lista = usuarios();

        const usuario = lista.find(item =>
            item.id === id &&
            item.tipo === "agricultor" &&
            item.status === "pendente"
        );

        if (!usuario) {
            alert("Solicitação não encontrada.");
            return false;
        }

        usuario.status = "aprovado";
        usuario.aprovadoEm = dataHoraAtual();

        if (!salvarUsuarios(lista)) {
            return false;
        }

        registrarHistorico(
            "Cadastro aprovado",
            usuario.id,
            "A direção aprovou o cadastro."
        );

        alert(
            "Cadastro de " + usuario.nome +
            " aprovado com sucesso!"
        );

        return true;
    }

    function rejeitarCadastro(id) {
        if (!exigirDirecao()) {
            return false;
        }

        const lista = usuarios();

        const usuario = lista.find(item =>
            item.id === id &&
            item.tipo === "agricultor" &&
            item.status === "pendente"
        );

        if (!usuario) {
            alert("Solicitação não encontrada.");
            return false;
        }

        usuario.status = "rejeitado";
        usuario.rejeitadoEm = dataHoraAtual();

        if (!salvarUsuarios(lista)) {
            return false;
        }

        registrarHistorico(
            "Cadastro rejeitado",
            usuario.id,
            "A direção rejeitou a solicitação."
        );

        alert("Solicitação rejeitada.");

        return true;
    }

    // --------------------------------------------------
    // 8. RELATÓRIOS
    // --------------------------------------------------

    function gerarRelatorio() {
        if (!exigirDirecao()) {
            return;
        }

        const listaUsuarios = usuarios();
        const listaAtividades = atividades();

        const aprovados = listaUsuarios.filter(item =>
            item.tipo === "agricultor" &&
            item.status === "aprovado"
        );

        const pendentes = listaUsuarios.filter(item =>
            item.tipo === "agricultor" &&
            item.status === "pendente"
        );

        const relatorio = [
            "TERRA VIVA",
            "RELATÓRIO GERAL",
            "Gerado em: " + dataHoraAtual(),
            "",
            "Agricultores aprovados: " + aprovados.length,
            "Cadastros pendentes: " + pendentes.length,
            "Atividades registradas: " + listaAtividades.length,
            "",
            "ATIVIDADES"
        ];

        listaAtividades.forEach(item => {
            const agricultor = listaUsuarios.find(usuario =>
                usuario.id === item.agricultorId
            );

            relatorio.push(
                "",
                "Agricultor: " +
                    (agricultor ? agricultor.nome : "Não identificado"),
                "Atividade: " + item.titulo,
                "Tipo: " + item.tipo,
                "Data: " + item.data,
                "Local: " + item.local,
                "Descrição: " + item.descricao,
                "Produção: " + item.producao
            );
        });

        const arquivo = new Blob(
            [relatorio.join("\n")],
            { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        link.href = url;
        link.download = "relatorio-terra-viva.txt";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    // --------------------------------------------------
    // 9. JANELAS DO SISTEMA
    // --------------------------------------------------

    function abrirModal(titulo, conteudo) {
        let modal = document.getElementById("terra-viva-modal");

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "terra-viva-modal";

            modal.style.cssText = `
                position: fixed;
                inset: 0;
                z-index: 9999;
                background: rgba(0, 0, 0, 0.55);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                overflow-y: auto;
            `;

            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="terra-viva-titulo"
                style="
                    background: white;
                    color: #26352a;
                    width: 100%;
                    max-width: 560px;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 28px;
                    border-radius: 16px;
                    box-sizing: border-box;
                    font-family: Arial, sans-serif;
                "
            >
                <button
                    type="button"
                    id="terra-viva-fechar"
                    aria-label="Fechar janela"
                    style="
                        float: right;
                        border: none;
                        background: none;
                        font-size: 25px;
                        cursor: pointer;
                    "
                >×</button>

                <h2 id="terra-viva-titulo">
                    ${escapar(titulo)}
                </h2>

                <div id="terra-viva-conteudo">
                    ${conteudo}
                </div>
            </section>
        `;

        modal.style.display = "flex";

        document.getElementById("terra-viva-fechar")
            .addEventListener("click", fecharModal);

        modal.addEventListener("click", function (evento) {
            if (evento.target === modal) {
                fecharModal();
            }
        });

        const primeiroCampo = modal.querySelector("input");

        if (primeiroCampo) {
            primeiroCampo.focus();
        }
    }

    function fecharModal() {
        const modal = document.getElementById("terra-viva-modal");

        if (modal) {
            modal.remove();
        }
    }

    function escapar(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => {
            const entidades = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entidades[caractere];
        });
    }

    function campo(nome, rotulo, tipo = "text", obrigatorio = true) {
        return `
            <label style="display:block; margin:14px 0;">
                <span style="display:block; margin-bottom:6px;">
                    ${escapar(rotulo)}
                </span>

                <input
                    name="${escapar(nome)}"
                    type="${escapar(tipo)}"
                    ${obrigatorio ? "required" : ""}
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        border:1px solid #cbd5cb;
                        border-radius:8px;
                    "
                >
            </label>
        `;
    }

    function areaTexto(nome, rotulo, obrigatorio = true) {
        return `
            <label style="display:block; margin:14px 0;">
                <span style="display:block; margin-bottom:6px;">
                    ${escapar(rotulo)}
                </span>

                <textarea
                    name="${escapar(nome)}"
                    ${obrigatorio ? "required" : ""}
                    rows="4"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        border:1px solid #cbd5cb;
                        border-radius:8px;
                        resize:vertical;
                    "
                ></textarea>
            </label>
        `;
    }

    function botao(rotulo, tipo = "submit") {
        return `
            <button
                type="${tipo}"
                style="
                    display:inline-block;
                    padding:12px 18px;
                    margin:8px 5px 8px 0;
                    border:0;
                    border-radius:8px;
                    background:#28633b;
                    color:white;
                    cursor:pointer;
                    font-weight:bold;
                "
            >
                ${escapar(rotulo)}
            </button>
        `;
    }

    function abrirLogin() {
        abrirModal("Entrar no Terra Viva", `
            <p>Acesse sua conta para continuar.</p>

            <form id="form-login">
                ${campo("email", "E-mail", "email")}
                ${campo("senha", "Senha", "password")}

                ${botao("Entrar")}
            </form>

            <hr>

            <p>Ainda não possui cadastro?</p>

            <button
                id="abrir-cadastro"
                type="button"
                style="
                    border:0;
                    background:none;
                    color:#28633b;
                    text-decoration:underline;
                    cursor:pointer;
                "
            >
                Solicitar cadastro de agricultor
            </button>
        `);

        document.getElementById("form-login")
            .addEventListener("submit", function (evento) {
                evento.preventDefault();

                const dados = new FormData(evento.currentTarget);

                if (entrar(
                    dados.get("email"),
                    dados.get("senha")
                )) {
                    fecharModal();
                    mostrarPainel();
                }
            });

        document.getElementById("abrir-cadastro")
            .addEventListener("click", abrirCadastro);
    }

    function abrirCadastro() {
        abrirModal("Solicitar cadastro", `
            <p>
                Depois do envio, sua solicitação ficará
                pendente até a aprovação da direção.
            </p>

            <form id="form-cadastro">
                ${campo("nome", "Nome completo")}
                ${campo("email", "E-mail", "email")}
                ${campo("senha", "Criar senha", "password")}
                ${campo("comunidade", "Comunidade ou propriedade")}

                ${botao("Enviar solicitação")}
            </form>
        `);

        document.getElementById("form-cadastro")
            .addEventListener("submit", function (evento) {
                evento.preventDefault();

                const dados = new FormData(evento.currentTarget);

                const nome = String(dados.get("nome") || "").trim();
                const email = String(dados.get("email") || "").trim();
                const senha = String(dados.get("senha") || "");
                const comunidade = String(
                    dados.get("comunidade") || ""
                ).trim();

                if (senha.length < 8) {
                    alert("Use uma senha com pelo menos 8 caracteres.");
                    return;
                }

                if (cadastrar({
                    nome,
                    email,
                    senha,
                    comunidade
                })) {
                    fecharModal();
                }
            });
    }

    // --------------------------------------------------
    // 10. NOVA ATIVIDADE
    // --------------------------------------------------

    function abrirRegistroAtividade() {
        if (!exigirLogin()) {
            return;
        }

        abrirModal("Registrar atividade agrícola", `
            <form id="form-atividade">
                ${campo("titulo", "Nome da atividade")}

                <label style="display:block; margin:14px 0;">
                    <span style="display:block; margin-bottom:6px;">
                        Tipo de atividade
                    </span>

                    <select
                        name="tipo"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:1px solid #cbd5cb;
                            border-radius:8px;
                        "
                    >
                        <option value="">Selecione</option>
                        <option value="Plantio">Plantio</option>
                        <option value="Colheita">Colheita</option>
                        <option value="Irrigação">Irrigação</option>
                        <option value="Compostagem">Compostagem</option>
                        <option value="Manejo do solo">Manejo do solo</option>
                        <option value="Manejo agroecológico">
                            Manejo agroecológico
                        </option>
                        <option value="Criação de animais">
                            Criação de animais
                        </option>
                        <option value="Outra atividade">
                            Outra atividade
                        </option>
                    </select>
                </label>

                ${campo("data", "Data da atividade", "date")}

                ${campo("local", "Local da atividade")}

                ${areaTexto("descricao", "Descrição da atividade")}

                ${campo("producao", "Quantidade produzida (opcional)", "text", false)}

                ${botao("Salvar atividade")}
            </form>
        `);

        document.getElementById("form-atividade")
            .addEventListener("submit", function (evento) {
                evento.preventDefault();

                const dados = new FormData(evento.currentTarget);

                const sucesso = registrarAtividade({
                    titulo: dados.get("titulo"),
                    tipo: dados.get("tipo"),
                    data: dados.get("data"),
                    local: dados.get("local"),
                    descricao: dados.get("descricao"),
                    producao: dados.get("producao") || ""
                });

                if (sucesso) {
                    fecharModal();
                    mostrarMeuCaderno();
                }
            });

        const data = document.querySelector(
            '#form-atividade input[name="data"]'
        );

        if (data) {
            data.value = dataAtual();
        }
    }

    // --------------------------------------------------
    // 11. MEU CADERNO
    // --------------------------------------------------

    function mostrarMeuCaderno() {
        if (!exigirLogin()) {
            return;
        }

        const lista = minhasAtividades();

        let conteudo = `
            <p>
                Agricultor(a): <strong>
                    ${escapar(usuarioAtual.nome)}
                </strong>
            </p>

            <p>Atividades registradas: ${lista.length}</p>

            ${botao("Registrar nova atividade", "button")}
        `;

        if (lista.length === 0) {
            conteudo += `
                <p>
                    Você ainda não possui atividades registradas.
                    Comece adicionando sua primeira atividade.
                </p>
            `;
        }

        lista.slice().reverse().forEach(item => {
            conteudo += `
                <article style="
                    padding:14px;
                    margin:12px 0;
                    border:1px solid #d8e2d8;
                    border-radius:10px;
                ">
                    <h3>${escapar(item.titulo)}</h3>
                    <p><strong>Tipo:</strong> ${escapar(item.tipo)}</p>
                    <p><strong>Data:</strong> ${escapar(item.data)}</p>
                    <p><strong>Local:</strong> ${escapar(item.local)}</p>
                    <p><strong>Descrição:</strong>
                        ${escapar(item.descricao)}
                    </p>
                    <p><strong>Produção:</strong>
                        ${escapar(item.producao || "Não informada")}
                    </p>
                </article>
            `;
        });

        abrirModal("Meu caderno de campo", conteudo);

        const botoes = document.querySelectorAll(
            "#terra-viva-conteudo button"
        );

        if (botoes.length > 0) {
            botoes[0].addEventListener(
                "click",
                abrirRegistroAtividade
            );
        }
    }

    // --------------------------------------------------
    // 12. PAINEL DA DIREÇÃO
    // --------------------------------------------------

    function mostrarPainel() {
        if (!exigirLogin()) {
            return;
        }

        if (usuarioAtual.tipo === "direcao") {
            mostrarPainelDirecao();
        } else {
            mostrarPainelAgricultor();
        }
    }

    function mostrarPainelAgricultor() {
        const lista = minhasAtividades();

        abrirModal("Meu espaço no Terra Viva", `
            <p>Olá, ${escapar(usuarioAtual.nome)}!</p>

            <p>Este é o seu espaço de trabalho.</p>

            <p>Atividades registradas: ${lista.length}</p>

            ${botao("Registrar atividade", "button")}
            ${botao("Meu caderno", "button")}
            ${botao("Sair da conta", "button")}
        `);

        const botoes = document.querySelectorAll(
            "#terra-viva-conteudo button"
        );

        botoes[0].addEventListener("click", abrirRegistroAtividade);
        botoes[1].addEventListener("click", mostrarMeuCaderno);
        botoes[2].addEventListener("click", function () {
            fecharModal();
            sair();
        });
    }

    function mostrarPainelDirecao() {
        if (!exigirDirecao()) {
            return;
        }

        const listaUsuarios = usuarios();
        const listaAtividades = atividades();

        const pendentes = listaUsuarios.filter(item =>
            item.tipo === "agricultor" &&
            item.status === "pendente"
        );

        let conteudo = `
            <p>Bem-vindo(a), ${escapar(usuarioAtual.nome)}!</p>

            <h3>Resumo geral</h3>

            <p>
                Agricultores cadastrados:
                ${listaUsuarios.filter(item =>
                    item.tipo === "agricultor"
                ).length}
            </p>

            <p>Cadastros pendentes: ${pendentes.length}</p>

            <p>Atividades registradas: ${listaAtividades.length}</p>

            ${botao("Gerar relatório", "button")}
            ${botao("Consultar cadernos", "button")}
            ${botao("Ver histórico", "button")}
            ${botao("Sair da conta", "button")}

            <hr>

            <h3>Solicitações de cadastro</h3>
        `;

        if (pendentes.length === 0) {
            conteudo += "<p>Não há solicitações pendentes.</p>";
        }

        pendentes.forEach(item => {
            conteudo += `
                <article style="
                    padding:12px;
                    margin:10px 0;
                    border:1px solid #d8e2d8;
                    border-radius:10px;
                ">
                    <p><strong>${escapar(item.nome)}</strong></p>
                    <p>${escapar(item.email)}</p>
                    <p>Comunidade: ${escapar(item.comunidade)}</p>

                    <button
                        type="button"
                        data-aprovar="${escapar(item.id)}"
                        style="
                            padding:9px;
                            background:#28633b;
                            color:white;
                            border:0;
                            border-radius:6px;
                            cursor:pointer;
                        "
                    >
                        Aprovar
                    </button>

                    <button
                        type="button"
                        data-rejeitar="${escapar(item.id)}"
                        style="
                            padding:9px;
                            background:#a33;
                            color:white;
                            border:0;
                            border-radius:6px;
                            cursor:pointer;
                        "
                    >
                        Rejeitar
                    </button>
                </article>
            `;
        });

        abrirModal("Painel da direção", conteudo);

        const botoes = document.querySelectorAll(
            "#terra-viva-conteudo > button"
        );

        botoes[0].addEventListener("click", gerarRelatorio);
        botoes[1].addEventListener("click", consultarCadernos);
        botoes[2].addEventListener("click", mostrarHistorico);

        botoes[3].addEventListener("click", function () {
            fecharModal();
            sair();
        });

        document.querySelectorAll("[data-aprovar]").forEach(botao => {
            botao.addEventListener("click", function () {
                if (aprovarCadastro(this.dataset.aprovar)) {
                    mostrarPainelDirecao();
                }
            });
        });

        document.querySelectorAll("[data-rejeitar]").forEach(botao => {
            botao.addEventListener("click", function () {
                if (rejeitarCadastro(this.dataset.rejeitar)) {
                    mostrarPainelDirecao();
                }
            });
        });
    }

    // --------------------------------------------------
    // 13. CONSULTAR CADERNOS
    // --------------------------------------------------

    function consultarCadernos() {
        if (!exigirDirecao()) {
            return;
        }

        const listaUsuarios = usuarios().filter(item =>
            item.tipo === "agricultor" &&
            item.status === "aprovado"
        );

        let conteudo = `
            <p>Selecione um agricultor para consultar seus registros.</p>
        `;

        listaUsuarios.forEach(item => {
            conteudo += `
                <article style="
                    padding:12px;
                    margin:10px 0;
                    border:1px solid #d8e2d8;
                    border-radius:8px;
                ">
                    <p><strong>${escapar(item.nome)}</strong></p>
                    <p>${escapar(item.comunidade)}</p>

                    <button
                        type="button"
                        data-consultar="${escapar(item.id)}"
                        style="
                            padding:10px;
                            border:0;
                            border-radius:6px;
                            background:#28633b;
                            color:white;
                            cursor:pointer;
                        "
                    >
                        Consultar caderno
                    </button>
                </article>
            `;
        });

        if (listaUsuarios.length === 0) {
            conteudo += "<p>Nenhum agricultor aprovado.</p>";
        }

        abrirModal("Cadernos dos agricultores", conteudo);

        document.querySelectorAll("[data-consultar]")
            .forEach(botao => {
                botao.addEventListener("click", function () {
                    consultarCadernoAgricultor(
                        this.dataset.consultar
                    );
                });
            });
    }

    function consultarCadernoAgricultor(agricultorId) {
        if (!exigirDirecao()) {
            return;
        }

        const agricultor = usuarios().find(item =>
            item.id === agricultorId &&
            item.tipo === "agricultor" &&
            item.status === "aprovado"
        );

        if (!agricultor) {
            alert("Agricultor não encontrado.");
            return;
        }

        const lista = atividades().filter(item =>
            item.agricultorId === agricultorId
        );

        let conteudo = `
            <h3>${escapar(agricultor.nome)}</h3>

            <p>Comunidade: ${escapar(agricultor.comunidade)}</p>

            <p>Total de atividades: ${lista.length}</p>
        `;

        lista.forEach(item => {
            conteudo += `
                <article style="
                    padding:12px;
                    margin:10px 0;
                    border:1px solid #d8e2d8;
                    border-radius:8px;
                ">
                    <h4>${escapar(item.titulo)}</h4>

                    <p>${escapar(item.data)} — ${escapar(item.tipo)}</p>

                    <p>${escapar(item.descricao)}</p>

                    <button
                        type="button"
                        data-corrigir="${escapar(item.id)}"
                        style="
                            padding:10px;
                            border:0;
                            border-radius:6px;
                            background:#28633b;
                            color:white;
                            cursor:pointer;
                        "
                    >
                        Corrigir registro
                    </button>
                </article>
            `;
        });

        if (lista.length === 0) {
            conteudo += "<p>Este caderno ainda está vazio.</p>";
        }

        abrirModal("Caderno do agricultor", conteudo);

        document.querySelectorAll("[data-corrigir]")
            .forEach(botao => {
                botao.addEventListener("click", function () {
                    abrirCorrecao(this.dataset.corrigir);
                });
            });
    }

    // --------------------------------------------------
    // 14. FORMULÁRIO DE CORREÇÃO
    // --------------------------------------------------

    function abrirCorrecao(id) {
        if (!exigirDirecao()) {
            return;
        }

        const registro = atividades().find(item =>
            item.id === id
        );

        if (!registro) {
            alert("Registro não encontrado.");
            return;
        }

        abrirModal("Corrigir atividade", `
            <p>
                As informações anteriores serão preservadas
                no histórico de alterações.
            </p>

            <form id="form-correcao">
                ${campo("titulo", "Nome da atividade")}
                ${campo("tipo", "Tipo de atividade")}
                ${campo("data", "Data", "date")}
                ${campo("local", "Local")}
                ${areaTexto("descricao", "Descrição")}
                ${campo("producao", "Produção", "text", false)}

                ${botao("Salvar correção")}
            </form>
        `);

        const formulario = document.getElementById("form-correcao");

        formulario.elements.titulo.value = registro.titulo;
        formulario.elements.tipo.value = registro.tipo;
        formulario.elements.data.value = registro.data;
        formulario.elements.local.value = registro.local;
        formulario.elements.descricao.value = registro.descricao;
        formulario.elements.producao.value = registro.producao;

        formulario.addEventListener("submit", function (evento) {
            evento.preventDefault();

            const dados = new FormData(formulario);

            if (corrigirAtividade(id, {
                titulo: dados.get("titulo"),
                tipo: dados.get("tipo"),
                data: dados.get("data"),
                local: dados.get("local"),
                descricao: dados.get("descricao"),
                producao: dados.get("producao") || ""
            })) {
                fecharModal();
                consultarCadernoAgricultor(registro.agricultorId);
            }
        });
    }

    // --------------------------------------------------
    // 15. HISTÓRICO DE ALTERAÇÕES
    // --------------------------------------------------

    function mostrarHistorico() {
        if (!exigirDirecao()) {
            return;
        }

        const lista = historico().slice().reverse();

        let conteudo = `
            <p>Histórico de ações registradas no sistema.</p>
        `;

        if (lista.length === 0) {
            conteudo += "<p>Nenhuma alteração registrada.</p>";
        }

        lista.forEach(item => {
            const responsavel = usuarios().find(usuario =>
                usuario.id === item.responsavel
            );

            conteudo += `
                <article style="
                    padding:12px;
                    margin:10px 0;
                    border:1px solid #d8e2d8;
                    border-radius:8px;
                    overflow-wrap:anywhere;
                ">
                    <p><strong>${escapar(item.acao)}</strong></p>

                    <p>Data: ${escapar(item.data)}</p>

                    <p>
                        Responsável:
                        ${escapar(
                            responsavel
                                ? responsavel.nome
                                : "Sistema"
                        )}
                    </p>

                    <p>Detalhes: ${escapar(item.detalhes)}</p>
                </article>
            `;
        });

        abrirModal("Histórico de alterações", conteudo);
    }

    // --------------------------------------------------
    // 16. INTEGRAÇÃO COM O HTML EXISTENTE
    // --------------------------------------------------

    function atualizarInterface() {
        const botaoEntrar = document.querySelector(".botao-entrar");

        if (botaoEntrar) {
            botaoEntrar.textContent = usuarioAtual
                ? "Minha conta"
                : "Entrar";
        }

        document.body.dataset.terraVivaLogado =
            usuarioAtual ? "true" : "false";
    }

    function configurarBotoes() {
        document.addEventListener("click", function (evento) {
            const botao = evento.target.closest("a, button");

            if (!botao) {
                return;
            }

            const texto = normalizar(
                botao.innerText || botao.textContent
            );

            const classe = normalizar(
                typeof botao.className === "string"
                    ? botao.className
                    : ""
            );

            // Botão de entrar ou acessar a conta.
            if (
                classe.includes("botao-entrar") ||
                texto === "entrar" ||
                texto === "fazer login" ||
                texto === "minha conta"
            ) {
                evento.preventDefault();

                if (usuarioAtual) {
                    mostrarPainel();
                } else {
                    abrirLogin();
                }

                return;
            }

            // Começar ou abrir o caderno.
            if (
                texto.includes("comecar caderno") ||
                texto.includes("começar caderno") ||
                texto.includes("meu caderno") ||
                texto.includes("minha colheita")
            ) {
                evento.preventDefault();

                if (usuarioAtual) {
                    mostrarMeuCaderno();
                } else {
                    abrirLogin();
                }

                return;
            }

            // Registrar uma atividade.
            if (
                texto.includes("registrar atividade") ||
                texto.includes("nova atividade")
            ) {
                evento.preventDefault();

                if (usuarioAtual) {
                    abrirRegistroAtividade();
                } else {
                    abrirLogin();
                }

                return;
            }

            // Acesso ao painel.
            if (
                texto.includes("painel da direcao") ||
                texto.includes("painel da direção")
            ) {
                evento.preventDefault();

                if (usuarioAtual) {
                    mostrarPainelDirecao();
                } else {
                    abrirLogin();
                }
            }
        });
    }

    // --------------------------------------------------
    // 17. INICIALIZAÇÃO
    // --------------------------------------------------

    function iniciar() {
        inicializar();
        restaurarSessao();
        atualizarInterface();
        configurarBotoes();

        console.log("Terra Viva está pronto para demonstração.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

    // Funções disponíveis para uso no próprio projeto.
    return {
        entrar,
        sair,
        cadastrar,
        registrarAtividade,
        minhasAtividades,
        mostrarMeuCaderno,
        mostrarPainel,
        mostrarPainelDirecao,
        gerarRelatorio,
        consultarCadernos,
        mostrarHistorico
    };

})();